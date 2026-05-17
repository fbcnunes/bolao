import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const ownedActiveBoloes = await prisma.bolaoMember.findMany({
    where: {
      userId: session.user.id,
      role: "ADMIN",
      status: "ATIVO",
      bolao: { status: "ATIVO" },
    },
    select: { bolao: { select: { nome: true } } },
  });

  if (ownedActiveBoloes.length > 0) {
    const names = ownedActiveBoloes.map((m) => m.bolao.nome).join(", ");
    return NextResponse.json(
      { message: `Transfira a função de admin antes de excluir sua conta: ${names}.` },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.bolaoMember.updateMany({
      where: { userId: session.user.id, status: { not: "REMOVIDO" } },
      data: { status: "REMOVIDO" },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { status: "REMOVIDO" },
    }),
  ]);

  return NextResponse.json({ message: "Sua conta foi marcada como removida." });
}
