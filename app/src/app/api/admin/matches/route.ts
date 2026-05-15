import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  const matches = await prisma.match.findMany({
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
    },
  });

  return NextResponse.json(matches);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { matchId, result, status } = body as {
    matchId: string;
    result: "CASA" | "EMPATE" | "FORA" | null;
    status: "AGENDADO" | "AO_VIVO" | "ENCERRADO";
  };

  if (!matchId || !status) {
    return NextResponse.json({ message: "Dados inválidos" }, { status: 400 });
  }

  if (status === "ENCERRADO" && !result) {
    return NextResponse.json({ message: "Resultado obrigatório para encerrar jogo" }, { status: 400 });
  }

  const match = await prisma.match.update({
    where: { id: matchId },
    data: { status, result: status === "ENCERRADO" ? result : null },
    include: {
      predictions: { where: { correct: null } },
    },
  });

  if (status === "ENCERRADO" && result) {
    for (const prediction of match.predictions) {
      const isCorrect = prediction.prediction === result;

      if (isCorrect) {
        const pointsEarned = 10;

        await prisma.prediction.update({
          where: { id: prediction.id },
          data: { correct: true },
        });

        const round = await prisma.round.findFirst({
          where: { phase: match.phase, number: match.round },
        });

        if (round) {
          await prisma.score.upsert({
            where: { userId_roundId: { userId: prediction.userId, roundId: round.id } },
            update: {
              roundPoints: { increment: pointsEarned },
              accumulatedPoints: { increment: pointsEarned },
            },
            create: {
              userId: prediction.userId,
              roundId: round.id,
              roundPoints: pointsEarned,
              accumulatedPoints: pointsEarned,
            },
          });
        }
      } else {
        await prisma.prediction.update({
          where: { id: prediction.id },
          data: { correct: false },
        });
      }
    }
  }

  return NextResponse.json({
    message: "Jogo atualizado com sucesso",
    predictionsProcessed: match.predictions.length,
  });
}
