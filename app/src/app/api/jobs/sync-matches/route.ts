import { NextResponse } from "next/server";
import { MatchStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { footballData, normalizeTeamName } from "@/lib/football-data";
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

export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
  }

  try {
    const allData = await footballData.getAllMatches();
    const apiMatches = (allData as FootballDataMatchesResponse).matches ?? [];

    let updatedCount = 0;
    let rescheduledCount = 0;

    for (const apiMatch of apiMatches) {
      const homeTeam = normalizeTeamName(apiMatch.homeTeam?.name ?? "");
      const awayTeam = normalizeTeamName(apiMatch.awayTeam?.name ?? "");
      if (!homeTeam || !awayTeam) continue;

      const dbMatches = await prisma.match.findMany({
        where: {
          status: { not: "ENCERRADO" },
          OR: [
            { homeTeam, awayTeam },
            { homeTeam: awayTeam, awayTeam: homeTeam },
          ],
        },
        select: { id: true, dateTime: true },
      });

      const apiDate = apiMatch.utcDate ? new Date(apiMatch.utcDate) : null;
      const dbMatch = apiDate
        ? dbMatches.sort(
            (a, b) =>
              Math.abs(a.dateTime.getTime() - apiDate.getTime()) -
              Math.abs(b.dateTime.getTime() - apiDate.getTime())
          )[0]
        : dbMatches[0];

      if (!dbMatch) continue;

      const status: MatchStatus = apiMatch.status === "IN_PLAY" || apiMatch.status === "PAUSED"
        ? MatchStatus.AO_VIVO
        : MatchStatus.AGENDADO;
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

    await markSyncCompleted(SYNC_KEYS.matches);

    return NextResponse.json({
      message: "Status dos jogos atualizado",
      apiCount: apiMatches.length,
      updatedCount,
      rescheduledCount,
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
