import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { footballData, normalizeTeamName } from "@/lib/football-data";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
  }

  try {
    const data = await footballData.getFinishedMatches();
    const apiMatches: any[] = data.matches ?? [];

    let processedCount = 0;
    let skippedCount = 0;

    for (const apiMatch of apiMatches) {
      const homeTeam = normalizeTeamName(apiMatch.homeTeam?.name ?? "");
      const awayTeam = normalizeTeamName(apiMatch.awayTeam?.name ?? "");
      const homeScore: number = apiMatch.score?.fullTime?.home ?? -1;
      const awayScore: number = apiMatch.score?.fullTime?.away ?? -1;

      if (!homeTeam || !awayTeam || homeScore < 0 || awayScore < 0) {
        skippedCount++;
        continue;
      }

      let result: "CASA" | "EMPATE" | "FORA";
      if (homeScore > awayScore) result = "CASA";
      else if (awayScore > homeScore) result = "FORA";
      else result = "EMPATE";

      const dbMatch = await prisma.match.findFirst({
        where: { homeTeam, awayTeam, status: { not: "ENCERRADO" } },
        include: {
          predictions: { where: { correct: null } },
        },
      });

      if (!dbMatch) {
        skippedCount++;
        continue;
      }

      await prisma.match.update({
        where: { id: dbMatch.id },
        data: { status: "ENCERRADO", result },
      });

      for (const prediction of dbMatch.predictions) {
        const isCorrect = prediction.prediction === result;

        if (isCorrect) {
          const pointsEarned = 10;

          await prisma.prediction.update({
            where: { id: prediction.id },
            data: { correct: true },
          });

          const round = await prisma.round.findFirst({
            where: { phase: dbMatch.phase, number: dbMatch.round },
          });

          if (round) {
            await prisma.score.upsert({
              where: { userId_roundId: { userId: prediction.userId, roundId: round.id } },
              update: {
                roundPoints: { increment: pointsEarned },
                accumulatedPoints: { increment: pointsEarned },
              },
              create: {
                userId: prediction.userId,
                roundId: round.id,
                roundPoints: pointsEarned,
                accumulatedPoints: pointsEarned,
              },
            });
          }
        } else {
          await prisma.prediction.update({
            where: { id: prediction.id },
            data: { correct: false },
          });
        }
      }

      processedCount++;
    }

    return NextResponse.json({
      message: "Resultados sincronizados",
      processedCount,
      skippedCount,
    });
  } catch (error: any) {
    console.error("sync-results error:", error);
    return NextResponse.json(
      { message: "Erro ao sincronizar resultados", error: error.message },
      { status: 500 }
    );
  }
}
