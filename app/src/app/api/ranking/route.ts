import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const roundId = searchParams.get("roundId");
    const bolaoId = searchParams.get("bolaoId");

    if (!bolaoId) {
      return NextResponse.json({ message: "Bolão obrigatório" }, { status: 400 });
    }

    const isMaster = session.user.role === "MASTER";

    if (!isMaster) {
      const membership = await prisma.bolaoMember.findUnique({
        where: { bolaoId_userId: { bolaoId, userId: session.user.id } },
        select: { status: true },
      });

      if (!membership || membership.status !== "ATIVO") {
        return NextResponse.json({ message: "Você não participa deste bolão" }, { status: 403 });
      }
    }

    let ranking;

    if (roundId) {
      // Ranking por rodada
      ranking = await prisma.score.findMany({
        where: { bolaoId, roundId },
        orderBy: [
          { roundPoints: "desc" },
          { bonus: "desc" }
        ],
        include: {
          user: {
            select: { id: true, name: true }
          }
        }
      });
    } else {
      // Ranking do bolão selecionado
      const members = await prisma.bolaoMember.findMany({
        where: { bolaoId, status: "ATIVO" },
        select: { userId: true },
      });
      const userIdFilter = members.map((m) => m.userId);

      const users = await prisma.user.findMany({
        where: {
          status: "ATIVO",
          id: { in: userIdFilter },
        },
        select: {
          id: true,
          name: true,
          scores: {
            where: { bolaoId },
            select: {
              accumulatedPoints: true
            }
          },
          predictions: {
            where: { bolaoId, correct: true },
            select: { id: true }
          }
        }
      });

      // Calcular o total e ordenar
      ranking = users.map(user => {
        const totalPoints = user.scores.reduce((sum, score) => sum + score.accumulatedPoints, 0);
        return {
          user: { id: user.id, name: user.name },
          totalPoints,
          correctPredictions: user.predictions.length
        };
      }).sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        // Desempate por número de acertos
        return b.correctPredictions - a.correctPredictions;
      });
    }

    return NextResponse.json(ranking);

  } catch (error) {
    console.error("Error fetching ranking:", error);
    return NextResponse.json({ message: "Erro ao buscar ranking" }, { status: 500 });
  }
}
