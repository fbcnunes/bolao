import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Rota pública — retorna resumo do bolão pelo inviteCode (sem expor dados sensíveis)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim();

  if (!code) {
    return NextResponse.json({ message: "Código obrigatório" }, { status: 400 });
  }

  const bolao = await prisma.bolao.findUnique({
    where: { inviteCode: code },
    select: {
      id: true,
      nome: true,
      status: true,
      createdAt: true,
      members: {
        where: { status: "ATIVO" },
        select: {
          role: true,
          user: { select: { name: true } },
        },
        orderBy: { user: { name: "asc" } },
      },
    },
  });

  if (!bolao) {
    return NextResponse.json({ message: "Código inválido ou bolão não encontrado" }, { status: 404 });
  }

  if (bolao.status !== "ATIVO") {
    return NextResponse.json({ message: "Este bolão não está aceitando novos membros" }, { status: 400 });
  }

  return NextResponse.json({
    id: bolao.id,
    nome: bolao.nome,
    createdAt: bolao.createdAt,
    memberCount: bolao.members.length,
    members: bolao.members.map((m) => ({
      name: m.user.name,
      role: m.role,
    })),
  });
}
