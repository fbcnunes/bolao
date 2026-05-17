import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const { bolaoId, predictions } = await req.json(); // Array of { matchId, prediction, oddId }

    if (!bolaoId || typeof bolaoId !== "string") {
      return NextResponse.json({ message: "Bolão obrigatório" }, { status: 400 });
    }

    if (!Array.isArray(predictions) || predictions.length === 0) {
      return NextResponse.json({ message: "Nenhum palpite enviado" }, { status: 400 });
    }

    const membership = await prisma.bolaoMember.findUnique({
      where: { bolaoId_userId: { bolaoId, userId: session.user.id } },
      select: { status: true },
    });

    if (!membership || membership.status !== "ATIVO") {
      return NextResponse.json({ message: "Você não participa deste bolão" }, { status: 403 });
    }

    const savedPredictions = [];
    const errors = [];

    for (const item of predictions) {
      const { matchId, prediction, oddId } = item;

      // Verify if the match exists and hasn't started
      const match = await prisma.match.findUnique({
        where: { id: matchId }
      });

      if (!match) {
        errors.push({ matchId, message: "Jogo não encontrado" });
        continue;
      }

      if (match.status !== "AGENDADO" || new Date() >= match.dateTime) {
        errors.push({ matchId, message: "Este jogo já começou ou está encerrado" });
        continue;
      }

      // Upsert the prediction (oddId may be null for matches without odds)
      const saved = await prisma.prediction.upsert({
        where: {
          bolaoId_userId_matchId: {
            bolaoId,
            userId: session.user.id,
            matchId: match.id
          }
        },
        update: {
          prediction,
          oddId: oddId ?? null,
          oddTimestamp: new Date(),
        },
        create: {
          bolaoId,
          userId: session.user.id,
          matchId: match.id,
          prediction,
          oddId: oddId ?? null,
          oddTimestamp: new Date(),
        }
      });

      savedPredictions.push(saved);
    }

    return NextResponse.json({ 
      message: "Palpites salvos com sucesso", 
      saved: savedPredictions.length,
      errors 
    });

  } catch (error) {
    console.error("Error saving batch predictions:", error);
    return NextResponse.json({ message: "Erro ao salvar palpites" }, { status: 500 });
  }
}
