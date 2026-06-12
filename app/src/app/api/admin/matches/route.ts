import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { recalculateScoresAndRoundBonuses } from "@/lib/scoring";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "MASTER") {
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
      odds: {
        orderBy: { capturedAt: "desc" },
        take: 1,
        select: {
          id: true,
          oddHome: true,
          oddDraw: true,
          oddAway: true,
          favorite: true,
          capturedAt: true,
        },
      },
    },
  });

  return NextResponse.json(matches);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "MASTER") {
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

  await prisma.match.update({
    where: { id: matchId },
    data: { status, result: status === "ENCERRADO" ? result : null },
  });

  const { predictionsProcessed, bonusAwarded } = await recalculateScoresAndRoundBonuses(prisma);

  return NextResponse.json({
    message: "Jogo atualizado e pontuação recalculada com sucesso",
    predictionsProcessed,
    bonusAwarded,
  });
}
