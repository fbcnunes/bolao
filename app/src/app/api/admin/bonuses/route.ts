import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { MatchPhase } from "@prisma/client";

const PHASE_POINTS: Record<string, number> = {
  GRUPOS: 10, PLAYOFFS: 15, OITAVAS: 20, QUARTAS: 30, SEMI: 40, FINAL: 50,
};

// BRT = UTC-3
function toBrtDay(dateTime: Date): string {
  const brt = new Date(dateTime.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "MASTER") {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  try {
    // 1. Zero out all existing bonus values; accumulatedPoints = roundPoints
    await prisma.score.updateMany({
      data: { bonus: 0 },
    });
    const allScores = await prisma.score.findMany();
    for (const score of allScores) {
      await prisma.score.update({
        where: { id: score.id },
        data: { accumulatedPoints: score.roundPoints },
      });
    }

    // 2. Get all correct predictions with match info
    const correctPredictions = await prisma.prediction.findMany({
      where: { correct: true },
      include: {
        match: { select: { phase: true, round: true, dateTime: true } },
      },
    });

    // 3. Group points by bolao + user + BRT day
    const dayBolaoUserPoints: Record<string, Record<string, Record<string, { points: number; phase: string; round: number }>>> = {};
    for (const pred of correctPredictions) {
      const day = toBrtDay(pred.match.dateTime);
      const pts = PHASE_POINTS[pred.match.phase] ?? 10;
      if (!dayBolaoUserPoints[day]) dayBolaoUserPoints[day] = {};
      if (!dayBolaoUserPoints[day][pred.bolaoId]) dayBolaoUserPoints[day][pred.bolaoId] = {};
      if (!dayBolaoUserPoints[day][pred.bolaoId][pred.userId]) {
        dayBolaoUserPoints[day][pred.bolaoId][pred.userId] = { points: 0, phase: pred.match.phase, round: pred.match.round };
      }
      dayBolaoUserPoints[day][pred.bolaoId][pred.userId].points += pts;
    }

    // 4. For each bolao/day, find the max and award +10 to winner(s)
    let bonusAwarded = 0;
    for (const [, bolaoMap] of Object.entries(dayBolaoUserPoints)) {
      for (const [bolaoId, userMap] of Object.entries(bolaoMap)) {
        const entries = Object.entries(userMap);
        const max = Math.max(...entries.map(([, v]) => v.points));
        if (max === 0) continue;

        const winners = entries.filter(([, v]) => v.points === max);
        for (const [userId, { phase, round }] of winners) {
          const roundRecord = await prisma.round.findFirst({
            where: { phase: phase as MatchPhase, number: round },
          });
          if (!roundRecord) continue;

          await prisma.score.upsert({
            where: { bolaoId_userId_roundId: { bolaoId, userId, roundId: roundRecord.id } },
            update: {
              bonus: { increment: 10 },
              accumulatedPoints: { increment: 10 },
            },
            create: {
              bolaoId,
              userId,
              roundId: roundRecord.id,
              roundPoints: 0,
              bonus: 10,
              accumulatedPoints: 10,
            },
          });
          bonusAwarded++;
        }
      }
    }

    return NextResponse.json({ message: "Bônus recalculados com sucesso", bonusAwarded });
  } catch (error) {
    console.error("bonus error:", error);
    return NextResponse.json(
      { message: "Erro ao calcular bônus", error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
