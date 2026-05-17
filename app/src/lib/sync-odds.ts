import prisma from "@/lib/prisma";
import { oddsApi, normalizeOddsTeamName } from "@/lib/odds-api";

export async function syncWorldCupOdds() {
  const events = await oddsApi.getWorldCupOdds();

  let syncedCount = 0;
  let skippedCount = 0;

  for (const event of events) {
    const apiHome = normalizeOddsTeamName(event.home_team);
    const apiAway = normalizeOddsTeamName(event.away_team);

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

  return { syncedCount, skippedCount };
}
