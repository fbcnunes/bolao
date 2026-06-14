import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { footballData, normalizeTeamName } from "@/lib/football-data";
import {
  findMatchForExternalMatch,
  isFinishedExternalStatus,
  isSameTeamOrder,
  normalizeExternalTeamName,
  resultFromScore,
  reverseResult,
} from "@/lib/match-sync";
import { markSyncCompleted, SYNC_KEYS } from "@/lib/sync-status";
import { recalculateScoresAndRoundBonuses } from "@/lib/scoring";

type FootballDataMatch = {
  utcDate?: string;
  homeTeam?: { name?: string };
  awayTeam?: { name?: string };
  score?: { fullTime?: { home?: number | null; away?: number | null } };
};

type LiveScoreFinishedMatchRow = {
  idMatch: string;
  homeTeam: string | null;
  awayTeam: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  matchDateTime: Date;
};

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
  }

  try {
    let processedCount = 0;
    let skippedCount = 0;
    let source = "livescore";

    const liveScoreMatches = await prisma.$queryRaw<LiveScoreFinishedMatchRow[]>`
      SELECT
        id_match AS idMatch,
        home_team AS homeTeam,
        away_team AS awayTeam,
        home_score AS homeScore,
        away_score AS awayScore,
        status,
        match_datetime AS matchDateTime
      FROM LiveScoreMatch
      WHERE home_team IS NOT NULL
        AND away_team IS NOT NULL
        AND home_score IS NOT NULL
        AND away_score IS NOT NULL
      ORDER BY match_datetime ASC
    `;

    for (const liveScoreMatch of liveScoreMatches) {
      const homeTeam = normalizeExternalTeamName(liveScoreMatch.homeTeam);
      const awayTeam = normalizeExternalTeamName(liveScoreMatch.awayTeam);

      if (
        !homeTeam ||
        !awayTeam ||
        liveScoreMatch.homeScore === null ||
        liveScoreMatch.awayScore === null ||
        !isFinishedExternalStatus(liveScoreMatch.status)
      ) {
        skippedCount++;
        continue;
      }

      const dbMatch = await findMatchForExternalMatch(
        prisma,
        {
          fifaMatchId: liveScoreMatch.idMatch,
          homeTeam,
          awayTeam,
          dateTime: liveScoreMatch.matchDateTime,
        },
        { excludeFinished: false }
      );

      if (!dbMatch) {
        skippedCount++;
        continue;
      }

      const apiResult = resultFromScore(liveScoreMatch.homeScore, liveScoreMatch.awayScore);
      const result = isSameTeamOrder(dbMatch, { homeTeam, awayTeam })
        ? apiResult
        : reverseResult(apiResult);

      await prisma.$executeRaw`
        UPDATE \`Match\`
        SET fifaMatchId = ${liveScoreMatch.idMatch},
            dateTime = ${liveScoreMatch.matchDateTime},
            status = 'ENCERRADO',
            result = ${result}
        WHERE id = ${dbMatch.id}
      `;

      processedCount++;
    }

    if (liveScoreMatches.length === 0) {
      source = "football-data";
      const data = await footballData.getFinishedMatches();
      const apiMatches: FootballDataMatch[] = data.matches ?? [];

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
        const apiDate = apiMatch.utcDate ? new Date(apiMatch.utcDate) : null;

        const dbMatch = await findMatchForExternalMatch(
          prisma,
          {
            homeTeam,
            awayTeam,
            dateTime: apiDate,
          },
          { excludeFinished: true }
        );

        if (!dbMatch) {
          skippedCount++;
          continue;
        }

        const result = isSameTeamOrder(dbMatch, { homeTeam, awayTeam })
          ? apiResult
          : reverseResult(apiResult);

        await prisma.match.update({
          where: { id: dbMatch.id },
          data: {
            status: "ENCERRADO",
            result,
            ...(apiDate ? { dateTime: apiDate } : {}),
          },
        });

        processedCount++;
      }
    }

    const recalculation = processedCount > 0
      ? await recalculateScoresAndRoundBonuses(prisma)
      : null;

    await markSyncCompleted(SYNC_KEYS.results);

    return NextResponse.json({
      message: "Resultados sincronizados",
      source,
      processedCount,
      skippedCount,
      recalculation,
    });
  } catch (error) {
    console.error("sync-results error:", error);
    return NextResponse.json(
      { message: "Erro ao sincronizar resultados", error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
