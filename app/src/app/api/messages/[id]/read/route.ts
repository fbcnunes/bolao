import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const { id } = await params;

  try {
    const msg = await prisma.message.findUnique({ where: { id } });

    if (!msg) return NextResponse.json({ message: "Mensagem não encontrada." }, { status: 404 });

    // Only the recipient (or master) can mark as read
    const canMark =
      session.user.role === "MASTER" ||
      msg.toUserId === session.user.id;

    if (!canMark) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

    if (msg.status === "ENVIADA") {
      await prisma.message.update({
        where: { id },
        data: { status: "LIDA" },
      });
    }

    return NextResponse.json({ message: "Marcada como lida." });
  } catch (error) {
    console.error("mark-read error:", error);
    return NextResponse.json({ message: "Erro ao marcar mensagem." }, { status: 500 });
  }
}
