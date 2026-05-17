import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

async function getDeadline(): Promise<Date | null> {
  const first = await prisma.match.findFirst({
    where: { phase: "GRUPOS" },
    orderBy: { dateTime: "asc" },
    select: { dateTime: true },
  });
  return first?.dateTime ?? null;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bolaoId = searchParams.get("bolaoId");
  if (!bolaoId) return NextResponse.json({ message: "Bolão obrigatório" }, { status: 400 });

  const [membership, deadline] = await Promise.all([
    prisma.bolaoMember.findUnique({
      where: { bolaoId_userId: { bolaoId, userId: session.user.id } },
      select: { championPick: true, status: true },
    }),
    getDeadline(),
  ]);

  if (!membership || membership.status !== "ATIVO") {
    return NextResponse.json({ message: "Você não participa deste bolão" }, { status: 403 });
  }

  const isLocked = deadline ? new Date() >= deadline : false;

  return NextResponse.json({
    championPick: membership.championPick ?? null,
    isLocked,
    deadline: deadline?.toISOString() ?? null,
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const deadline = await getDeadline();
  if (deadline && new Date() >= deadline) {
    return NextResponse.json({ message: "Prazo encerrado. A competição já começou." }, { status: 403 });
  }

  const { bolaoId, team } = await req.json();
  if (!bolaoId || typeof bolaoId !== "string") {
    return NextResponse.json({ message: "Bolão obrigatório" }, { status: 400 });
  }

  if (!team || typeof team !== "string" || team.trim() === "") {
    return NextResponse.json({ message: "Time inválido." }, { status: 400 });
  }

  const membership = await prisma.bolaoMember.findUnique({
    where: { bolaoId_userId: { bolaoId, userId: session.user.id } },
    select: { status: true },
  });

  if (!membership || membership.status !== "ATIVO") {
    return NextResponse.json({ message: "Você não participa deste bolão" }, { status: 403 });
  }

  const updated = await prisma.bolaoMember.update({
    where: { bolaoId_userId: { bolaoId, userId: session.user.id } },
    data: { championPick: team.trim() },
    select: { championPick: true },
  });

  return NextResponse.json({ championPick: updated.championPick });
}
