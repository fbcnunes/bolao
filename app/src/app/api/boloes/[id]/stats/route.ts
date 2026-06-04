import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id: bolaoId } = await params;
  const isMaster = session.user.role === "MASTER";

  const membership = isMaster
    ? null
    : await prisma.bolaoMember.findUnique({
        where: { bolaoId_userId: { bolaoId, userId: session.user.id } },
        select: { role: true, status: true },
      });

  if (!isMaster && (!membership || membership.status !== "ATIVO")) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  const [total, ativos, pendentes] = await Promise.all([
    prisma.bolaoMember.count({ where: { bolaoId } }),
    prisma.bolaoMember.count({ where: { bolaoId, status: "ATIVO" } }),
    prisma.bolaoMember.count({ where: { bolaoId, status: "PENDENTE" } }),
  ]);

  return NextResponse.json({
    role: isMaster ? "ADMIN" : membership?.role,
    total,
    ativos,
    pendentes,
  });
}
