import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const round = searchParams.get("round");
  const today = searchParams.get("today");

  try {
    let whereClause: any = {};

    if (round) {
      whereClause.round = parseInt(round);
    }

    if (today === "true") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      whereClause.dateTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const matches = await prisma.match.findMany({
      where: whereClause,
      orderBy: { dateTime: "asc" },
      include: {
        odds: {
          orderBy: { capturedAt: "desc" },
          take: 1,
        },
        predictions: {
          where: { userId: session.user.id },
        },
      },
    });

    return NextResponse.json(matches);
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json({ message: "Erro ao buscar jogos" }, { status: 500 });
  }
}
