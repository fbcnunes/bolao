import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { footballData, normalizeTeamName } from "@/lib/football-data";
import {
  findMatchForExternalMatch,
  normalizeExternalTeamName,
  statusFromFootballData,
  statusFromLiveScore,
} from "@/lib/match-sync";
import { markSyncCompleted, SYNC_KEYS } from "@/lib/sync-status";

const CRON_SECRET = process.env.CRON_SECRET;

type FootballDataMatch = {
  utcDate?: string | null;
  status?: string | null;
  homeTeam?: { name?: string | null } | null;
  awayTeam?: { name?: string | null } | null;
};

type FootballDataMatchesResponse = {
  matches?: FootballDataMatch[];
};

type LiveScoreMatchRow = {
  idMatch: string;
  homeTeam: string | null;
  awayTeam: string | null;
  status: string;
  matchDateTime: Date;
};

export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
  }

  try {
    let updatedCount = 0;
    let rescheduledCount = 0;
    let skippedCount = 0;
    let source = "livescore";

    const liveScoreMatches = await prisma.$queryRaw<LiveScoreMatchRow[]>`
      SELECT
        id_match AS idMatch,
        home_team AS homeTeam,
        away_team AS awayTeam,
        status,
        match_datetime AS matchDateTime
      FROM LiveScoreMatch
      WHERE home_team IS NOT NULL
        AND away_team IS NOT NULL
      ORDER BY match_datetime ASC
    `;

    for (const liveScoreMatch of liveScoreMatches) {
      const homeTeam = normalizeExternalTeamName(liveScoreMatch.homeTeam);
      const awayTeam = normalizeExternalTeamName(liveScoreMatch.awayTeam);
      if (!homeTeam || !awayTeam) {
        skippedCount++;
        continue;
      }

      const status = statusFromLiveScore(liveScoreMatch.status);
      if (!status) {
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
        { excludeFinished: true }
      );

      if (!dbMatch) {
        skippedCount++;
        continue;
      }

      const data = {
        fifaMatchId: liveScoreMatch.idMatch,
        status,
        dateTime: liveScoreMatch.matchDateTime,
      };

      if (dbMatch.dateTime.getTime() !== liveScoreMatch.matchDateTime.getTime()) {
        rescheduledCount++;
      }

      await prisma.$executeRaw`
        UPDATE \`Match\`
        SET fifaMatchId = ${data.fifaMatchId},
            status = ${data.status},
            dateTime = ${data.dateTime}
        WHERE id = ${dbMatch.id}
      `;
      updatedCount++;
    }

    if (liveScoreMatches.length === 0) {
      source = "football-data";
      const allData = await footballData.getAllMatches();
      const apiMatches = (allData as FootballDataMatchesResponse).matches ?? [];

      for (const apiMatch of apiMatches) {
        const homeTeam = normalizeTeamName(apiMatch.homeTeam?.name ?? "");
        const awayTeam = normalizeTeamName(apiMatch.awayTeam?.name ?? "");
        if (!homeTeam || !awayTeam) {
          skippedCount++;
          continue;
        }

        const status = statusFromFootballData(apiMatch.status);
        if (!status) {
          skippedCount++;
          continue;
        }

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

        const data = {
          status,
          ...(apiDate ? { dateTime: apiDate } : {}),
        };

        if (apiDate && dbMatch.dateTime.getTime() !== apiDate.getTime()) {
          rescheduledCount++;
        }

        await prisma.match.update({
          where: { id: dbMatch.id },
          data,
        });
        updatedCount++;
      }
    }

    await markSyncCompleted(SYNC_KEYS.matches);

    return NextResponse.json({
      message: "Status dos jogos atualizado",
      source,
      apiCount: source === "livescore" ? liveScoreMatches.length : undefined,
      updatedCount,
      rescheduledCount,
      skippedCount,
    });
  } catch (error) {
    console.error("sync-matches error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { message: "Erro ao sincronizar jogos", error: message },
      { status: 500 }
    );
  }
}
