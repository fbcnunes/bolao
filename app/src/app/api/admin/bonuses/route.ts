import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { recalculateScoresAndRoundBonuses } from "@/lib/scoring";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "MASTER") {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  try {
    const { bonusAwarded, matchesProcessed, predictionsProcessed } =
      await recalculateScoresAndRoundBonuses(prisma);

    return NextResponse.json({
      message: "Pontuação e bônus recalculados com sucesso",
      bonusAwarded,
      matchesProcessed,
      predictionsProcessed,
    });
  } catch (error) {
    console.error("bonus error:", error);
    return NextResponse.json(
      { message: "Erro ao recalcular pontuação e bônus", error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
