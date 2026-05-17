import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

type BolaoSettings = {
  id: string;
  nome: string;
  premiacaoRegra: string | null;
};

async function getMembership(bolaoId: string, userId: string) {
  return prisma.bolaoMember.findUnique({
    where: { bolaoId_userId: { bolaoId, userId } },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id: bolaoId } = await params;
  const isMaster = session.user.role === "MASTER";

  if (!isMaster) {
    const membership = await getMembership(bolaoId, session.user.id);
    if (!membership || membership.status !== "ATIVO") {
      return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
    }
  }

  const [bolao] = await prisma.$queryRaw<BolaoSettings[]>`
    SELECT id, nome, premiacaoRegra
    FROM Bolao
    WHERE id = ${bolaoId}
    LIMIT 1
  `;

  if (!bolao) return NextResponse.json({ message: "Bolão não encontrado" }, { status: 404 });

  return NextResponse.json(bolao);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id: bolaoId } = await params;
  const isMaster = session.user.role === "MASTER";

  if (!isMaster) {
    const membership = await getMembership(bolaoId, session.user.id);
    if (!membership || membership.role !== "ADMIN" || membership.status !== "ATIVO") {
      return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
    }
  }

  const { premiacaoRegra } = await req.json();
  if (premiacaoRegra !== null && premiacaoRegra !== undefined && typeof premiacaoRegra !== "string") {
    return NextResponse.json({ message: "Regra de premiação inválida" }, { status: 400 });
  }

  const text = premiacaoRegra?.trim() || null;
  if (text && text.length > 2000) {
    return NextResponse.json({ message: "A regra de premiação deve ter até 2000 caracteres" }, { status: 400 });
  }

  await prisma.$executeRaw`
    UPDATE Bolao
    SET premiacaoRegra = ${text}
    WHERE id = ${bolaoId}
  `;

  const [bolao] = await prisma.$queryRaw<BolaoSettings[]>`
    SELECT id, nome, premiacaoRegra
    FROM Bolao
    WHERE id = ${bolaoId}
    LIMIT 1
  `;

  if (!bolao) return NextResponse.json({ message: "Bolão não encontrado" }, { status: 404 });

  return NextResponse.json({ message: "Regra de premiação salva.", bolao });
}
