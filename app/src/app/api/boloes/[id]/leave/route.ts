import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id: bolaoId } = await params;

  const membership = await prisma.bolaoMember.findUnique({
    where: { bolaoId_userId: { bolaoId, userId: session.user.id } },
    include: { bolao: { select: { nome: true, status: true } } },
  });

  if (!membership || membership.status !== "ATIVO") {
    return NextResponse.json({ message: "Você não participa ativamente deste bolão." }, { status: 400 });
  }

  if (membership.role === "ADMIN") {
    return NextResponse.json(
      { message: "Antes de sair, transfira a função de admin para outro participante ativo." },
      { status: 400 }
    );
  }

  await prisma.bolaoMember.update({
    where: { bolaoId_userId: { bolaoId, userId: session.user.id } },
    data: { status: "REMOVIDO" },
  });

  return NextResponse.json({ message: `Você saiu do bolão "${membership.bolao.nome}".` });
}
