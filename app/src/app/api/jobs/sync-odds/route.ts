import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { oddsApi, normalizeOddsTeamName } from "@/lib/odds-api";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
  }

  try {
    const events = await oddsApi.getWorldCupOdds();

    let syncedCount = 0;
    let skippedCount = 0;

    for (const event of events) {
      const apiHome = normalizeOddsTeamName(event.home_team);
      const apiAway = normalizeOddsTeamName(event.away_team);

      // Match by both teams regardless of home/away order (API may differ from our seed)
      const dbMatch = await prisma.match.findFirst({
        where: {
          status: "AGENDADO",
          OR: [
            { homeTeam: apiHome, awayTeam: apiAway },
            { homeTeam: apiAway, awayTeam: apiHome },
          ],
        },
      });

      if (!dbMatch) {
        skippedCount++;
        continue;
      }

      const bookmaker = event.bookmakers.find((b) =>
        b.markets.some((m) => m.key === "h2h")
      );
      const market = bookmaker?.markets.find((m) => m.key === "h2h");

      if (!market) {
        skippedCount++;
        continue;
      }

      const drawOutcome = market.outcomes.find(
        (o) => o.name.toLowerCase() === "draw"
      );

      // Find odds by matching against the DB home/away team names
      const dbHomeOutcome = market.outcomes.find(
        (o) => normalizeOddsTeamName(o.name) === dbMatch.homeTeam
      );
      const dbAwayOutcome = market.outcomes.find(
        (o) => normalizeOddsTeamName(o.name) === dbMatch.awayTeam
      );

      if (!dbHomeOutcome || !dbAwayOutcome || !drawOutcome) {
        skippedCount++;
        continue;
      }

      const oddHome = dbHomeOutcome.price;
      const oddDraw = drawOutcome.price;
      const oddAway = dbAwayOutcome.price;

      let favorite: "CASA" | "EMPATE" | "FORA";
      if (oddHome <= oddAway && oddHome <= oddDraw) favorite = "CASA";
      else if (oddAway <= oddHome && oddAway <= oddDraw) favorite = "FORA";
      else favorite = "EMPATE";

      await prisma.odd.create({
        data: { matchId: dbMatch.id, oddHome, oddDraw, oddAway, favorite },
      });

      syncedCount++;
    }

    return NextResponse.json({
      message: "Odds sincronizadas com sucesso",
      syncedCount,
      skippedCount,
    });
  } catch (error: any) {
    console.error("sync-odds error:", error);
    return NextResponse.json(
      { message: "Erro ao sincronizar odds", error: error.message },
      { status: 500 }
    );
  }
}
