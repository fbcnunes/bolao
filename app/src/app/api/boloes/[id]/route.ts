import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// Exclui um bolão — permitido para o Master, para um Admin ativo do bolão
// ou para o criador enquanto o bolão ainda está pendente de aprovação.
// Bolão que nunca esteve ativo e não tem palpites/pontuações é apagado de vez;
// caso contrário é soft delete (status EXCLUIDO), preservando o histórico.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const bolao = await prisma.bolao.findUnique({ where: { id } });
  if (!bolao) return NextResponse.json({ message: "Bolão não encontrado" }, { status: 404 });
  if (bolao.status === "EXCLUIDO") {
    return NextResponse.json({ message: "Este bolão já foi excluído." }, { status: 400 });
  }

  const isMaster = session.user.role === "MASTER";
  const isPendingOwner = bolao.createdById === session.user.id && bolao.status === "PENDENTE";

  if (!isMaster && !isPendingOwner) {
    const membership = await prisma.bolaoMember.findUnique({
      where: { bolaoId_userId: { bolaoId: id, userId: session.user.id } },
    });
    if (!membership || membership.role !== "ADMIN" || membership.status !== "ATIVO") {
      return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
    }
  }

  const [predictionCount, scoreCount] = await Promise.all([
    prisma.prediction.count({ where: { bolaoId: id } }),
    prisma.score.count({ where: { bolaoId: id } }),
  ]);

  // Bolão que nunca foi jogado: apaga de vez em vez de poluir a base
  if (bolao.status !== "ATIVO" && predictionCount === 0 && scoreCount === 0) {
    await prisma.$transaction([
      prisma.message.updateMany({ where: { bolaoId: id }, data: { bolaoId: null } }),
      prisma.bolaoMember.deleteMany({ where: { bolaoId: id } }),
      prisma.bolao.delete({ where: { id } }),
    ]);
    return NextResponse.json({ message: `Bolão "${bolao.nome}" excluído.` });
  }

  // Soft delete: o bolão some das listas, mas palpites e pontuações ficam no histórico
  const recipients = await prisma.bolaoMember.findMany({
    where: { bolaoId: id, status: "ATIVO", userId: { not: session.user.id } },
    select: { userId: true },
  });

  await prisma.$transaction([
    prisma.bolao.update({
      where: { id },
      data: { status: "EXCLUIDO", deletedAt: new Date() },
    }),
    prisma.message.createMany({
      data: recipients.map((r) => ({
        fromUserId: session.user.id,
        toUserId: r.userId,
        bolaoId: id,
        subject: `O bolão "${bolao.nome}" foi encerrado`,
        body: `O bolão "${bolao.nome}" foi excluído ${isMaster ? "pela administração do sistema" : "pelo admin do bolão"}. Ele não aparecerá mais na sua lista de bolões.`,
      })),
    }),
  ]);

  return NextResponse.json({ message: `Bolão "${bolao.nome}" excluído.` });
}
