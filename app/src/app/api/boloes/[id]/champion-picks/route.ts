import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

async function getDeadline(): Promise<Date | null> {
  const firstMatch = await prisma.match.findFirst({
    where: { phase: "GRUPOS" },
    orderBy: { dateTime: "asc" },
    select: { dateTime: true },
  });

  return firstMatch?.dateTime ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const { id: bolaoId } = await params;

  try {
    const [requester, deadline] = await Promise.all([
      prisma.bolaoMember.findUnique({
        where: { bolaoId_userId: { bolaoId, userId: session.user.id } },
        select: { status: true },
      }),
      getDeadline(),
    ]);

    if (!requester || requester.status !== "ATIVO") {
      return NextResponse.json(
        { message: "Você não participa deste bolão" },
        { status: 403 }
      );
    }

    const predictionsVisible = deadline ? new Date() >= deadline : false;

    if (!predictionsVisible) {
      return NextResponse.json({
        predictionsVisible: false,
        deadline: deadline?.toISOString() ?? null,
      });
    }

    const members = await prisma.bolaoMember.findMany({
      where: { bolaoId, status: "ATIVO" },
      select: {
        userId: true,
        championPick: true,
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    const counts = new Map<string, number>();
    for (const member of members) {
      if (member.championPick) {
        counts.set(member.championPick, (counts.get(member.championPick) ?? 0) + 1);
      }
    }

    const distribution = Array.from(counts, ([team, count]) => ({ team, count }))
      .sort((a, b) => b.count - a.count || a.team.localeCompare(b.team, "pt-BR"));

    const totalPredictions = distribution.reduce((sum, item) => sum + item.count, 0);

    return NextResponse.json({
      predictionsVisible: true,
      deadline: deadline?.toISOString() ?? null,
      summary: {
        totalMembers: members.length,
        totalPredictions,
        missingPredictions: members.length - totalPredictions,
        distribution,
      },
      predictions: members.map((member) => ({
        userId: member.userId,
        name: member.user.name,
        championPick: member.championPick,
        isMe: member.userId === session.user.id,
      })),
    });
  } catch (error) {
    console.error("Error fetching champion picks:", error);
    return NextResponse.json(
      { message: "Erro ao buscar palpites de campeão" },
      { status: 500 }
    );
  }
}
