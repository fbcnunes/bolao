import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// Aprova ou recusa um bolão — ao aprovar, torna o criador ADMIN do bolão
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "MASTER") {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const { action } = await req.json();

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ message: "Ação inválida" }, { status: 400 });
  }

  const bolao = await prisma.bolao.findUnique({ where: { id } });
  if (!bolao) return NextResponse.json({ message: "Bolão não encontrado" }, { status: 404 });

  if (action === "approve") {
    await prisma.$transaction([
      prisma.bolao.update({ where: { id }, data: { status: "ATIVO" } }),
      prisma.bolaoMember.upsert({
        where: { bolaoId_userId: { bolaoId: id, userId: bolao.createdById } },
        update: { role: "ADMIN", status: "ATIVO" },
        create: {
          bolaoId: id,
          userId: bolao.createdById,
          role: "ADMIN",
          status: "ATIVO",
        },
      }),
    ]);
    return NextResponse.json({ message: "Bolão aprovado. Criador definido como Admin." });
  }

  await prisma.bolao.update({ where: { id }, data: { status: "RECUSADO" } });
  return NextResponse.json({ message: "Bolão recusado." });
}
