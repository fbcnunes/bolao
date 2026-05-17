import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// Lista membros do bolão — acessível pelo ADMIN do bolão ou MASTER
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id: bolaoId } = await params;

  const isMaster = session.user.role === "MASTER";

  if (!isMaster) {
    const membership = await prisma.bolaoMember.findUnique({
      where: { bolaoId_userId: { bolaoId, userId: session.user.id } },
    });
    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
    }
  }

  const members = await prisma.bolaoMember.findMany({
    where: { bolaoId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return NextResponse.json(members);
}
