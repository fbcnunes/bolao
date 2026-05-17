import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// Aprova, recusa, remove, reativa ou transfere admin — ADMIN do bolão ou MASTER
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; uid: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id: bolaoId, uid: userId } = await params;
  const { action } = await req.json();

  const isMaster = session.user.role === "MASTER";

  if (!isMaster) {
    const membership = await prisma.bolaoMember.findUnique({
      where: { bolaoId_userId: { bolaoId, userId: session.user.id } },
    });
    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
    }
  }

  const validActions = ["approve", "reject", "remove", "reactivate", "makeAdmin"];
  if (!validActions.includes(action)) {
    return NextResponse.json({ message: "Ação inválida" }, { status: 400 });
  }

  const targetMembership = await prisma.bolaoMember.findUnique({
    where: { bolaoId_userId: { bolaoId, userId } },
    include: { user: { select: { name: true } } },
  });

  if (!targetMembership) {
    return NextResponse.json({ message: "Participante não encontrado neste bolão." }, { status: 404 });
  }

  if (action === "makeAdmin") {
    if (targetMembership.status !== "ATIVO") {
      return NextResponse.json({ message: "Só é possível transferir admin para um participante ativo." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.bolaoMember.updateMany({
        where: { bolaoId, role: "ADMIN" },
        data: { role: "PARTICIPANTE" },
      }),
      prisma.bolaoMember.update({
        where: { bolaoId_userId: { bolaoId, userId } },
        data: { role: "ADMIN", status: "ATIVO" },
      }),
    ]);

    return NextResponse.json({ message: `${targetMembership.user.name} agora é admin deste bolão.` });
  }

  if (action === "remove" && targetMembership.role === "ADMIN") {
    return NextResponse.json({ message: "Transfira a função de admin antes de remover este participante." }, { status: 400 });
  }

  const newStatus =
    action === "reject" ? "RECUSADO" :
    action === "remove" ? "REMOVIDO" :
    "ATIVO";

  const updated = await prisma.bolaoMember.update({
    where: { bolaoId_userId: { bolaoId, userId } },
    data: { status: newStatus },
    include: { user: { select: { name: true } } },
  });

  const label =
    newStatus === "ATIVO" ? (action === "reactivate" ? "reativado" : "aprovado") :
    newStatus === "REMOVIDO" ? "removido" :
    "recusado";
  return NextResponse.json({ message: `${updated.user.name} foi ${label}.` });
}
