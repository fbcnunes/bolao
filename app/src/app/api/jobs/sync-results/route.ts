import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiFootball } from "@/lib/api-football";

export async function GET(req: Request) {
  try {
    // We only need to check matches that are past their start time and not yet marked as ENCERRADO
    // Or we just re-fetch matches for today/yesterday to ensure we catch updates
    
    // For simplicity, let's fetch recent matches from the API
    const recentMatches = await apiFootball.getMatches(); // Ideally, filter by date here
    
    let processedCount = 0;

    for (const apiMatch of recentMatches) {
      if (apiMatch.fixture.status.short === "FT" || apiMatch.fixture.status.short === "AET" || apiMatch.fixture.status.short === "PEN") {
        
        // Determine result
        let result: any = "EMPATE";
        if (apiMatch.teams.home.winner) result = "CASA";
        else if (apiMatch.teams.away.winner) result = "FORA";

        // Find the match in our DB
        const dbMatch = await prisma.match.findUnique({
          where: { apiId: apiMatch.fixture.id },
          include: {
            predictions: {
              where: { correct: null } // Only process unprocessed predictions
            }
          }
        });

        if (dbMatch && dbMatch.status !== "ENCERRADO") {
          // Update match status and result
          await prisma.match.update({
            where: { id: dbMatch.id },
            data: { status: "ENCERRADO", result },
          });

          // Calculate points for predictions
          for (const prediction of dbMatch.predictions) {
            const isCorrect = prediction.prediction === result;
            
            // Get the odd used for this prediction
            const odd = await prisma.odd.findUnique({ where: { id: prediction.oddId } });
            
            if (isCorrect && odd) {
              let oddValue = 1;
              if (result === "CASA") oddValue = odd.oddHome;
              if (result === "EMPATE") oddValue = odd.oddDraw;
              if (result === "FORA") oddValue = odd.oddAway;

              // Points = odd * 10 (e.g., 2.5 -> 25 points)
              const pointsEarned = oddValue * 10;

              // Update Prediction
              await prisma.prediction.update({
                where: { id: prediction.id },
                data: { correct: true },
              });

              // Update Score
              // Find round first
              const round = await prisma.round.findFirst({
                where: { phase: dbMatch.phase, number: dbMatch.round }
              });

              if (round) {
                await prisma.score.upsert({
                  where: {
                    userId_roundId: { userId: prediction.userId, roundId: round.id }
                  },
                  update: {
                    roundPoints: { increment: pointsEarned },
                    accumulatedPoints: { increment: pointsEarned }
                  },
                  create: {
                    userId: prediction.userId,
                    roundId: round.id,
                    roundPoints: pointsEarned,
                    accumulatedPoints: pointsEarned
                  }
                });
              }

            } else {
              // Incorrect prediction
              await prisma.prediction.update({
                where: { id: prediction.id },
                data: { correct: false },
              });
            }
          }
          processedCount++;
        }
      }
    }

    return NextResponse.json({ 
      message: "Resultados sincronizados e pontos calculados", 
      processedCount 
    });

  } catch (error) {
    console.error("Error syncing results:", error);
    return NextResponse.json({ message: "Erro ao sincronizar resultados" }, { status: 500 });
  }
}
