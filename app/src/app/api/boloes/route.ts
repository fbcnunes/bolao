import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { randomInt } from "crypto";

async function generateInviteCode() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const inviteCode = randomInt(0, 10000).toString().padStart(4, "0");
    const existing = await prisma.bolao.findUnique({ where: { inviteCode } });

    if (!existing) return inviteCode;
  }

  throw new Error("Não foi possível gerar um código de convite único.");
}

// Lista os bolões do usuário autenticado
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const memberships = await prisma.bolaoMember.findMany({
    where: { userId: session.user.id, status: "ATIVO" },
    include: {
      bolao: {
        select: {
          id: true,
          nome: true,
          inviteCode: true,
          status: true,
          createdAt: true,
          _count: { select: { members: { where: { status: "ATIVO" } } } },
        },
      },
    },
  });

  // Bolões criados pelo usuário ainda pendentes (antes de virar membro)
  const pendingOwned = await prisma.bolao.findMany({
    where: { createdById: session.user.id, status: "PENDENTE" },
    select: {
      id: true,
      nome: true,
      inviteCode: true,
      status: true,
      createdAt: true,
      _count: { select: { members: { where: { status: "ATIVO" } } } },
    },
  });

  const fromMemberships = memberships.map((m) => ({
    ...m.bolao,
    memberRole: m.role,
  }));

  const fromPending = pendingOwned
    .filter((b) => !fromMemberships.find((m) => m.id === b.id))
    .map((b) => ({ ...b, memberRole: "ADMIN" as const }));

  return NextResponse.json([...fromMemberships, ...fromPending]);
}

// Solicita criação de um novo bolão
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  if (session.user.status !== "ATIVO") {
    return NextResponse.json({ message: "Conta não ativa" }, { status: 403 });
  }

  const { nome } = await req.json();
  if (!nome?.trim()) {
    return NextResponse.json({ message: "Nome do bolão é obrigatório" }, { status: 400 });
  }

  const inviteCode = await generateInviteCode();

  const bolao = await prisma.bolao.create({
    data: {
      nome: nome.trim(),
      inviteCode,
      createdById: session.user.id,
      status: "PENDENTE",
    },
  });

  return NextResponse.json(
    { message: "Solicitação enviada! Aguarde aprovação do Master.", bolao },
    { status: 201 }
  );
}
