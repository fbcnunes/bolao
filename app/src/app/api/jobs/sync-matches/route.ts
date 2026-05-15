import { NextResponse } from "next/server";
import { PredictionResult, MatchStatus, MatchPhase } from "@prisma/client";
import prisma from "@/lib/prisma";
import { apiFootball } from "@/lib/api-football";

export async function GET(req: Request) {
  // In a real app, you'd protect this route with a secret key or verify it's a cron job
  // const authHeader = req.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    const matches = await apiFootball.getMatches();

    if (!matches || matches.length === 0) {
      return NextResponse.json({ message: "Nenhum jogo encontrado na API" }, { status: 404 });
    }

    let syncedCount = 0;

    for (const match of matches) {
      const { fixture, league, teams, score } = match;

      // Determine match phase and round
      // This is simplified. In a real scenario, you map API-Football rounds to your MatchPhase enum
      let phase: MatchPhase = MatchPhase.GRUPOS;
      if (league.round.includes("Round of 16")) phase = MatchPhase.OITAVAS;
      if (league.round.includes("Quarter-finals")) phase = MatchPhase.QUARTAS;
      if (league.round.includes("Semi-finals")) phase = MatchPhase.SEMI;
      if (league.round.includes("Final")) phase = MatchPhase.FINAL;

      let matchStatus: MatchStatus = MatchStatus.AGENDADO;
      if (fixture.status.short === "FT" || fixture.status.short === "AET" || fixture.status.short === "PEN") {
        matchStatus = MatchStatus.ENCERRADO;
      } else if (["1H", "HT", "2H", "ET", "P", "LIVE"].includes(fixture.status.short)) {
        matchStatus = MatchStatus.AO_VIVO;
      }

      let result: PredictionResult | null = null;
      if (matchStatus === MatchStatus.ENCERRADO) {
        if (teams.home.winner) result = PredictionResult.CASA;
        else if (teams.away.winner) result = PredictionResult.FORA;
        else result = PredictionResult.EMPATE;
      }

      await prisma.match.upsert({
        where: { apiId: fixture.id },
        update: {
          homeTeam: teams.home.name,
          awayTeam: teams.away.name,
          dateTime: new Date(fixture.date),
          status: matchStatus,
          result: result,
        },
        create: {
          apiId: fixture.id,
          phase: phase,
          round: 1, // You'd need a robust way to extract the round number
          homeTeam: teams.home.name,
          awayTeam: teams.away.name,
          dateTime: new Date(fixture.date),
          status: matchStatus,
          result: result,
        },
      });

      syncedCount++;
    }

    return NextResponse.json({ 
      message: "Sincronização concluída", 
      syncedCount,
      totalReceived: matches.length 
    });

  } catch (error) {
    console.error("Error syncing matches:", error);
    return NextResponse.json({ message: "Erro ao sincronizar jogos" }, { status: 500 });
  }
}
