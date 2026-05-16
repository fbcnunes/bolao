import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  const { id, action } = await params;

  try {
    let newStatus: "ATIVO" | "RECUSADO" | "PENDENTE";

    if (action === "approve" || action === "reactivate") {
      newStatus = "ATIVO";
    } else if (action === "reject") {
      newStatus = "RECUSADO";
    } else {
      return NextResponse.json({ message: "Ação inválida" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, name: true, status: true },
    });

    const actionLabel = newStatus === "ATIVO" ? (action === "reactivate" ? "reativado" : "aprovado") : "recusado";
    return NextResponse.json({
      message: `Usuário ${updatedUser.name} foi ${actionLabel}.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error(`Error updating user status (${action}):`, error);
    return NextResponse.json({ message: "Erro ao atualizar usuário" }, { status: 500 });
  }
}
