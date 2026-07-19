import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { MatchPhase, PredictionResult } from "@prisma/client";

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

    const now = new Date();
    const matchIds = predictions.map((p: { matchId: string }) => p.matchId);

    const matches = await prisma.match.findMany({
      where: { id: { in: matchIds } },
      select: { id: true, phase: true, status: true, dateTime: true },
    });
    const matchMap = new Map(matches.map((m) => [m.id, m]));

    const valid: { matchId: string; prediction: PredictionResult; oddId: string | null }[] = [];
    const errors: { matchId: string; message: string }[] = [];

    const VALID_PREDICTIONS = new Set<PredictionResult>(["CASA", "EMPATE", "FORA"]);

    for (const item of predictions) {
      const { matchId, prediction, oddId } = item;
      const match = matchMap.get(matchId);

      if (!match) {
        errors.push({ matchId, message: "Jogo não encontrado" });
        continue;
      }
      if (!VALID_PREDICTIONS.has(prediction)) {
        errors.push({ matchId, message: "Palpite inválido" });
        continue;
      }
      if (match.phase !== MatchPhase.GRUPOS && prediction === "EMPATE") {
        errors.push({ matchId, message: "No mata-mata, escolha apenas casa ou fora" });
        continue;
      }
      if (match.status !== "AGENDADO" || now >= match.dateTime) {
        errors.push({ matchId, message: "Este jogo já começou ou está encerrado" });
        continue;
      }

      valid.push({ matchId, prediction: prediction as PredictionResult, oddId: oddId ?? null });
    }

    if (valid.length === 0) {
      return NextResponse.json({ message: "Nenhum palpite válido para salvar", saved: 0, errors });
    }

    const userId = session.user.id;
    const savedPredictions = await prisma.$transaction(
      valid.map(({ matchId, prediction, oddId }) =>
        prisma.prediction.upsert({
          where: { bolaoId_userId_matchId: { bolaoId, userId, matchId } },
          update: { prediction, oddId, oddTimestamp: now },
          create: { bolaoId, userId, matchId, prediction, oddId, oddTimestamp: now },
        })
      )
    );

    return NextResponse.json({
      message: "Palpites salvos com sucesso",
      saved: savedPredictions.length,
      errors,
    });

  } catch (error) {
    console.error("Error saving batch predictions:", error);
    return NextResponse.json({ message: "Erro ao salvar palpites" }, { status: 500 });
  }
}
