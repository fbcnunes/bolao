import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

type BolaoJoin = {
  id: string;
  nome: string;
  status: "PENDENTE" | "ATIVO" | "RECUSADO";
  entradaDireta: boolean;
};

// Entra num bolão via inviteCode ou id
export async function POST(
  req: Request
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { inviteCode } = await req.json();
  if (!inviteCode?.trim()) {
    return NextResponse.json({ message: "Código de convite é obrigatório" }, { status: 400 });
  }

  const [bolao] = await prisma.$queryRaw<BolaoJoin[]>`
    SELECT id, nome, status, entradaDireta
    FROM Bolao
    WHERE inviteCode = ${inviteCode.trim()}
    LIMIT 1
  `;

  if (!bolao) {
    return NextResponse.json({ message: "Código inválido ou bolão não encontrado" }, { status: 404 });
  }

  if (bolao.status !== "ATIVO") {
    return NextResponse.json({ message: "Este bolão não está ativo" }, { status: 400 });
  }

  const existing = await prisma.bolaoMember.findUnique({
    where: { bolaoId_userId: { bolaoId: bolao.id, userId: session.user.id } },
  });
  const memberStatus = bolao.entradaDireta ? "ATIVO" : "PENDENTE";
  const successMessage = bolao.entradaDireta
    ? `Você entrou no bolão "${bolao.nome}"!`
    : `Solicitação enviada para "${bolao.nome}"! Aguarde aprovação do admin.`;

  if (existing) {
    if (existing.status === "ATIVO") {
      return NextResponse.json({ message: "Você já é membro deste bolão" }, { status: 400 });
    }
    if (existing.status === "PENDENTE") {
      return NextResponse.json({ message: "Sua solicitação já está pendente de aprovação" }, { status: 400 });
    }
    if (existing.status === "RECUSADO") {
      return NextResponse.json({ message: "Sua entrada neste bolão foi recusada pelo administrador. Entre em contato com ele para ser reativado." }, { status: 403 });
    }
    if (existing.status === "REMOVIDO") {
      await prisma.bolaoMember.update({
        where: { bolaoId_userId: { bolaoId: bolao.id, userId: session.user.id } },
        data: { role: "PARTICIPANTE", status: memberStatus },
      });
      return NextResponse.json(
        { message: bolao.entradaDireta ? `Você voltou para o bolão "${bolao.nome}"!` : successMessage, bolaoId: bolao.id, status: memberStatus },
        { status: 201 }
      );
    }
  }

  await prisma.bolaoMember.create({
    data: {
      bolaoId: bolao.id,
      userId: session.user.id,
      role: "PARTICIPANTE",
      status: memberStatus,
    },
  });

  return NextResponse.json(
    { message: successMessage, bolaoId: bolao.id, status: memberStatus },
    { status: 201 }
  );
}
