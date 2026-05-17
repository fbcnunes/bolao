import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// Lista todos os bolões (para o Master)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "MASTER") {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  const boloes = await prisma.bolao.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { members: { where: { status: "ATIVO" } } } },
    },
  });

  return NextResponse.json(boloes);
}
