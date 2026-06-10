import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PredictionResult } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

const RESULT_LABELS: Record<PredictionResult, string> = {
  CASA: "Casa",
  EMPATE: "Empate",
  FORA: "Fora",
};

function canRevealPredictions(match: { status: string; dateTime: Date }) {
  return match.status !== "AGENDADO" || new Date() >= match.dateTime;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bolaoId = searchParams.get("bolaoId");
  const matchId = searchParams.get("matchId");

  if (!bolaoId) {
    return NextResponse.json({ message: "Bolão obrigatório" }, { status: 400 });
  }

  try {
    const membership = await prisma.bolaoMember.findUnique({
      where: { bolaoId_userId: { bolaoId, userId: session.user.id } },
      select: { status: true },
    });

    if (!membership || membership.status !== "ATIVO") {
      return NextResponse.json({ message: "Você não participa deste bolão" }, { status: 403 });
    }

    const availableMatches = await prisma.match.findMany({
      orderBy: { dateTime: "asc" },
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        dateTime: true,
        status: true,
        result: true,
        phase: true,
        round: true,
        group: true,
      },
    });

    const selectedMatches = await prisma.match.findMany({
      where: matchId ? { id: matchId } : { status: "AO_VIVO" },
      orderBy: { dateTime: "asc" },
      include: {
        odds: {
          orderBy: { capturedAt: "desc" },
          take: 1,
        },
      },
    });

    if (matchId && selectedMatches.length === 0) {
      return NextResponse.json({ message: "Jogo não encontrado" }, { status: 404 });
    }

    const predictionWhere = matchId
      ? { bolaoId, matchId }
      : { bolaoId, matchId: { in: selectedMatches.map((match) => match.id) } };

    const activeMembers = await prisma.bolaoMember.findMany({
      where: { bolaoId, status: "ATIVO" },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            predictions: {
              where: predictionWhere,
              select: {
                matchId: true,
                prediction: true,
                correct: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    const matches = selectedMatches.map((match) => {
      const predictionsVisible = canRevealPredictions(match);
      const counts: Record<PredictionResult, number> = {
        CASA: 0,
        EMPATE: 0,
        FORA: 0,
      };

      const predictions = activeMembers
        .map((member) => {
          const prediction = member.user.predictions.find((item) => item.matchId === match.id);

          if (prediction && predictionsVisible) {
            counts[prediction.prediction] += 1;
          }

          return {
            user: {
              id: member.user.id,
              name: member.user.name,
            },
            prediction: predictionsVisible && prediction ? prediction.prediction : null,
            predictionLabel: predictionsVisible && prediction ? RESULT_LABELS[prediction.prediction] : null,
            correct: predictionsVisible && prediction ? prediction.correct : null,
            updatedAt: predictionsVisible && prediction ? prediction.updatedAt : null,
          };
        })
        .sort((a, b) => a.user.name.localeCompare(b.user.name, "pt-BR"));

      const totalPredictions = Object.values(counts).reduce((sum, count) => sum + count, 0);

      return {
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        dateTime: match.dateTime,
        status: match.status,
        result: match.result,
        phase: match.phase,
        round: match.round,
        group: match.group,
        odds: match.odds,
        predictionsVisible,
        summary: {
          totalMembers: activeMembers.length,
          totalPredictions,
          missingPredictions: activeMembers.length - totalPredictions,
          counts,
        },
        predictions: predictionsVisible ? predictions : [],
      };
    });

    return NextResponse.json({
      availableMatches: availableMatches.map((match) => ({
        ...match,
        predictionsVisible: canRevealPredictions(match),
      })),
      matches,
    });
  } catch (error) {
    console.error("Error fetching match predictions:", error);
    return NextResponse.json({ message: "Erro ao buscar palpites do jogo" }, { status: 500 });
  }
}
