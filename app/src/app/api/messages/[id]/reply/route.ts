import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const { id } = await params;

  try {
    const { body } = await req.json();

    if (!body?.trim()) {
      return NextResponse.json({ message: "A resposta não pode estar vazia." }, { status: 400 });
    }

    const parent = await prisma.message.findUnique({
      where: { id },
      include: { fromUser: true },
    });

    if (!parent) return NextResponse.json({ message: "Mensagem não encontrada." }, { status: 404 });

    // Only recipient (master) or original sender can reply
    const canReply =
      session.user.role === "MASTER" ||
      parent.fromUserId === session.user.id ||
      parent.toUserId === session.user.id;

    if (!canReply) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

    // The reply is directed to whoever sent the parent
    const toUserId =
      session.user.id === parent.fromUserId
        ? (parent.toUserId ?? null)
        : parent.fromUserId;

    const reply = await prisma.message.create({
      data: {
        fromUserId: session.user.id,
        toUserId,
        subject: `Re: ${parent.subject}`,
        body: body.trim(),
        parentId: id,
        bolaoId: parent.bolaoId,
      },
      include: {
        fromUser: { select: { id: true, name: true } },
      },
    });

    // Mark parent as responded
    await prisma.message.update({
      where: { id },
      data: { status: "RESPONDIDA" },
    });

    return NextResponse.json({ message: "Resposta enviada.", data: reply }, { status: 201 });
  } catch (error) {
    console.error("reply error:", error);
    return NextResponse.json({ message: "Erro ao enviar resposta." }, { status: 500 });
  }
}
