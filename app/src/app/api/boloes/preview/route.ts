import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type BolaoPreviewRow = {
  id: string;
  nome: string;
  status: "PENDENTE" | "ATIVO" | "RECUSADO";
  createdAt: Date;
  entradaDireta: boolean;
};

// Rota pública — retorna resumo do bolão pelo inviteCode (sem expor dados sensíveis)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim();

  if (!code) {
    return NextResponse.json({ message: "Código obrigatório" }, { status: 400 });
  }

  const [bolao] = await prisma.$queryRaw<BolaoPreviewRow[]>`
    SELECT id, nome, status, createdAt, entradaDireta
    FROM Bolao
    WHERE inviteCode = ${code}
    LIMIT 1
  `;

  if (!bolao) {
    return NextResponse.json({ message: "Código inválido ou bolão não encontrado" }, { status: 404 });
  }

  if (bolao.status !== "ATIVO") {
    return NextResponse.json({ message: "Este bolão não está aceitando novos membros" }, { status: 400 });
  }

  const [memberCount, admin] = await Promise.all([
    prisma.bolaoMember.count({
      where: { bolaoId: bolao.id, status: "ATIVO" },
    }),
    prisma.bolaoMember.findFirst({
      where: { bolaoId: bolao.id, status: "ATIVO", role: "ADMIN" },
      select: { user: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({
    id: bolao.id,
    nome: bolao.nome,
    createdAt: bolao.createdAt,
    entradaDireta: Boolean(bolao.entradaDireta),
    memberCount,
    adminName: admin?.user.name ?? null,
  });
}
