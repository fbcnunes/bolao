import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { footballData, normalizeTeamName } from "@/lib/football-data";

const CRON_SECRET = process.env.CRON_SECRET;

type FootballDataMatch = {
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
    const [liveData, finishedData] = await Promise.all([
      footballData.getLiveMatches(),
      footballData.getFinishedMatches(),
    ]);

    const liveMatches = (liveData as FootballDataMatchesResponse).matches ?? [];
    const finishedMatches = (finishedData as FootballDataMatchesResponse).matches ?? [];

    let updatedCount = 0;

    // Mark live matches
    for (const apiMatch of liveMatches) {
      const homeTeam = normalizeTeamName(apiMatch.homeTeam?.name ?? "");
      const awayTeam = normalizeTeamName(apiMatch.awayTeam?.name ?? "");
      if (!homeTeam || !awayTeam) continue;

      const updated = await prisma.match.updateMany({
        where: { homeTeam, awayTeam, status: "AGENDADO" },
        data: { status: "AO_VIVO" },
      });
      updatedCount += updated.count;
    }

    // Mark finished matches (without calculating points — sync-results handles that)
    for (const apiMatch of finishedMatches) {
      const homeTeam = normalizeTeamName(apiMatch.homeTeam?.name ?? "");
      const awayTeam = normalizeTeamName(apiMatch.awayTeam?.name ?? "");
      if (!homeTeam || !awayTeam) continue;

      const updated = await prisma.match.updateMany({
        where: { homeTeam, awayTeam, status: "AO_VIVO" },
        data: { status: "AGENDADO" }, // Temp: sync-results will set ENCERRADO with result
      });
      updatedCount += updated.count;
    }

    return NextResponse.json({
      message: "Status dos jogos atualizado",
      liveCount: liveMatches.length,
      finishedCount: finishedMatches.length,
      updatedCount,
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
