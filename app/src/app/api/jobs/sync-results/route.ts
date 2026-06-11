import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { footballData, normalizeTeamName } from "@/lib/football-data";
import { markSyncCompleted, SYNC_KEYS } from "@/lib/sync-status";

type FootballDataMatch = {
  utcDate?: string;
  homeTeam?: { name?: string };
  awayTeam?: { name?: string };
  score?: { fullTime?: { home?: number | null; away?: number | null } };
};

const CRON_SECRET = process.env.CRON_SECRET;

type PredictionResult = "CASA" | "EMPATE" | "FORA";

function reverseResult(result: PredictionResult): PredictionResult {
  if (result === "CASA") return "FORA";
  if (result === "FORA") return "CASA";
  return result;
}

function resultFromScore(homeScore: number, awayScore: number): PredictionResult {
  if (homeScore > awayScore) return "CASA";
  if (awayScore > homeScore) return "FORA";
  return "EMPATE";
}

export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
  }

  try {
    const data = await footballData.getFinishedMatches();
    const apiMatches: FootballDataMatch[] = data.matches ?? [];

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

      const apiResult = resultFromScore(homeScore, awayScore);

      const candidateMatches = await prisma.match.findMany({
        where: {
          status: { not: "ENCERRADO" },
          OR: [
            { homeTeam, awayTeam },
            { homeTeam: awayTeam, awayTeam: homeTeam },
          ],
        },
        orderBy: { dateTime: "asc" },
        include: {
          predictions: { where: { correct: null } },
        },
      });
      const apiDate = apiMatch.utcDate ? new Date(apiMatch.utcDate) : null;
      const dbMatch = apiDate
        ? candidateMatches.sort(
            (a, b) =>
              Math.abs(a.dateTime.getTime() - apiDate.getTime()) -
              Math.abs(b.dateTime.getTime() - apiDate.getTime())
          )[0]
        : candidateMatches[0];

      if (!dbMatch) {
        skippedCount++;
        continue;
      }

      const isSameOrder = dbMatch.homeTeam === homeTeam && dbMatch.awayTeam === awayTeam;
      const result = isSameOrder ? apiResult : reverseResult(apiResult);

      await prisma.match.update({
        where: { id: dbMatch.id },
        data: { status: "ENCERRADO", result },
      });

      const PHASE_POINTS: Record<string, number> = {
        GRUPOS: 10, PLAYOFFS: 15, OITAVAS: 20, QUARTAS: 30, SEMI: 40, FINAL: 50,
      };

      for (const prediction of dbMatch.predictions) {
        const isCorrect = prediction.prediction === result;

        if (isCorrect) {
          const pointsEarned = PHASE_POINTS[dbMatch.phase] ?? 10;

          await prisma.prediction.update({
            where: { id: prediction.id },
            data: { correct: true },
          });

          const round = await prisma.round.findFirst({
            where: { phase: dbMatch.phase, number: dbMatch.round },
          });

          if (round) {
            await prisma.score.upsert({
              where: { bolaoId_userId_roundId: { bolaoId: prediction.bolaoId, userId: prediction.userId, roundId: round.id } },
              update: {
                roundPoints: { increment: pointsEarned },
                accumulatedPoints: { increment: pointsEarned },
              },
              create: {
                bolaoId: prediction.bolaoId,
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

    await markSyncCompleted(SYNC_KEYS.matches);

    return NextResponse.json({
      message: "Resultados sincronizados",
      processedCount,
      skippedCount,
    });
  } catch (error) {
    console.error("sync-results error:", error);
    return NextResponse.json(
      { message: "Erro ao sincronizar resultados", error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
