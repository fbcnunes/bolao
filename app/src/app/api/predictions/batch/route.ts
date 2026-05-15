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
    const { predictions } = await req.json(); // Array of { matchId, prediction, oddId, oddTimestamp }

    if (!Array.isArray(predictions) || predictions.length === 0) {
      return NextResponse.json({ message: "Nenhum palpite enviado" }, { status: 400 });
    }

    const savedPredictions = [];
    const errors = [];

    for (const item of predictions) {
      const { matchId, prediction, oddId, oddTimestamp } = item;

      // Verify if the match exists and hasn't started
      const match = await prisma.match.findUnique({
        where: { id: matchId }
      });

      if (!match) {
        errors.push({ matchId, message: "Jogo não encontrado" });
        continue;
      }

      if (match.status !== "AGENDADO" && new Date() >= match.dateTime) {
        errors.push({ matchId, message: "Este jogo já começou ou está encerrado" });
        continue;
      }

      // Upsert the prediction
      const saved = await prisma.prediction.upsert({
        where: {
          userId_matchId: {
            userId: session.user.id,
            matchId: match.id
          }
        },
        update: {
          prediction,
          oddId,
          oddTimestamp: new Date(oddTimestamp)
        },
        create: {
          userId: session.user.id,
          matchId: match.id,
          prediction,
          oddId,
          oddTimestamp: new Date(oddTimestamp)
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
