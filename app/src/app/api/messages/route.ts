import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET /api/messages — list messages for the current user (received) or all if MASTER
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const box = searchParams.get("box") ?? "inbox"; // inbox | sent

  try {
    if (session.user.role === "MASTER") {
      // Master sees all messages sent to any admin/master or without specific recipient (broadcast)
      const messages = await prisma.message.findMany({
        where: {
          parentId: null,
          ...(box === "sent"
            ? { fromUserId: session.user.id }
            : { OR: [{ toUserId: session.user.id }, { toUserId: null }] }),
        },
        include: {
          fromUser: { select: { id: true, name: true, email: true } },
          toUser: { select: { id: true, name: true, email: true } },
          bolao: { select: { id: true, nome: true } },
          replies: {
            include: { fromUser: { select: { id: true, name: true } } },
            orderBy: { createdAt: "asc" },
          },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(messages);
    }

    // Regular user
    const messages = await prisma.message.findMany({
      where: {
        parentId: null,
        ...(box === "sent"
          ? { fromUserId: session.user.id }
          : { toUserId: session.user.id }),
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
        bolao: { select: { id: true, nome: true } },
        replies: {
          include: { fromUser: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("GET /api/messages error:", error);
    return NextResponse.json({ message: "Erro ao buscar mensagens." }, { status: 500 });
  }
}

// POST /api/messages — send a message
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  try {
    const { subject, body, bolaoId } = await req.json();

    if (!subject?.trim() || !body?.trim()) {
      return NextResponse.json({ message: "Assunto e mensagem são obrigatórios." }, { status: 400 });
    }

    // Find the master user to set as recipient
    const master = await prisma.user.findFirst({ where: { role: "MASTER" } });

    // If sender is master, toUserId can be null (broadcast) or specified
    const toUserId = session.user.role === "MASTER" ? null : (master?.id ?? null);

    const message = await prisma.message.create({
      data: {
        fromUserId: session.user.id,
        toUserId,
        bolaoId: bolaoId ?? null,
        subject: subject.trim(),
        body: body.trim(),
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ message: "Mensagem enviada com sucesso.", data: message }, { status: 201 });
  } catch (error) {
    console.error("POST /api/messages error:", error);
    return NextResponse.json({ message: "Erro ao enviar mensagem." }, { status: 500 });
  }
}
