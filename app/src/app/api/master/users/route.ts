import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// Gestão global de usuários — exclusivo do Master
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "MASTER") {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      role: true,
      createdAt: true,
      bolaoMembers: {
        where: {
          status: "ATIVO",
          bolao: { status: "ATIVO" },
        },
        orderBy: { bolao: { nome: "asc" } },
        select: {
          role: true,
          status: true,
          bolao: {
            select: {
              id: true,
              nome: true,
              status: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(users);
}
