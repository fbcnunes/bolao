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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const [user, deadline] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { championPick: true },
    }),
    getDeadline(),
  ]);

  const isLocked = deadline ? new Date() >= deadline : false;

  return NextResponse.json({
    championPick: user?.championPick ?? null,
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

  const { team } = await req.json();
  if (!team || typeof team !== "string" || team.trim() === "") {
    return NextResponse.json({ message: "Time inválido." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { championPick: team.trim() },
    select: { championPick: true },
  });

  return NextResponse.json({ championPick: user.championPick });
}
