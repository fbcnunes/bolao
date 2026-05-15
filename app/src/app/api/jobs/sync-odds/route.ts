import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiFootball } from "@/lib/api-football";

export async function GET(req: Request) {
  try {
    // Get all scheduled matches
    const upcomingMatches = await prisma.match.findMany({
      where: { status: "AGENDADO" },
    });

    if (upcomingMatches.length === 0) {
      return NextResponse.json({ message: "Nenhum jogo agendado encontrado." });
    }

    let syncedCount = 0;

    for (const match of upcomingMatches) {
      const oddsData = await apiFootball.getOdds(match.apiId);

      if (oddsData && oddsData.length > 0) {
        // Find Match Winner market (usually id: 1)
        const matchWinnerMarket = oddsData[0].bookmakers[0]?.bets.find((b: any) => b.id === 1);

        if (matchWinnerMarket) {
          const oddHome = parseFloat(matchWinnerMarket.values.find((v: any) => v.value === "Home")?.odd || "1");
          const oddDraw = parseFloat(matchWinnerMarket.values.find((v: any) => v.value === "Draw")?.odd || "1");
          const oddAway = parseFloat(matchWinnerMarket.values.find((v: any) => v.value === "Away")?.odd || "1");

          // Determine favorite
          let favorite: any = "EMPATE";
          if (oddHome < oddAway && oddHome < oddDraw) favorite = "CASA";
          if (oddAway < oddHome && oddAway < oddDraw) favorite = "FORA";

          await prisma.odd.create({
            data: {
              matchId: match.id,
              oddHome,
              oddDraw,
              oddAway,
              favorite,
            },
          });
          syncedCount++;
        }
      }
      
      // Delay to respect API rate limits (e.g., 10 requests / second)
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return NextResponse.json({ 
      message: "Odds sincronizadas com sucesso", 
      syncedCount 
    });

  } catch (error) {
    console.error("Error syncing odds:", error);
    return NextResponse.json({ message: "Erro ao sincronizar odds" }, { status: 500 });
  }
}
