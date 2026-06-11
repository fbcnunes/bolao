import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { sendEmailChangeNoticeEmail } from "@/lib/mailer";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "MASTER") {
    return NextResponse.json({ message: "Não autorizado." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ message: "E-mail inválido." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findFirst({
      where: { email: normalizedEmail, NOT: { id } },
    });

    if (existing) {
      return NextResponse.json({ message: "Este e-mail já está em uso por outro usuário." }, { status: 409 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
    }

    if (user.email.toLowerCase() === normalizedEmail) {
      return NextResponse.json({ message: "Este já é o e-mail atual do usuário." }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: { email: normalizedEmail },
        select: { id: true, name: true, email: true },
      });

      await tx.$executeRaw`
        INSERT INTO UserEmailChangeAudit (id, userId, changedById, oldEmail, newEmail, createdAt)
        VALUES (UUID(), ${id}, ${session.user.id}, ${user.email}, ${normalizedEmail}, NOW(3))
      `;

      return updatedUser;
    });

    try {
      await Promise.allSettled([
        sendEmailChangeNoticeEmail(user.email, updated.name, user.email, normalizedEmail, "old"),
        sendEmailChangeNoticeEmail(normalizedEmail, updated.name, user.email, normalizedEmail, "new"),
      ]);
    } catch {
      // Non-fatal: email notification failure shouldn't block the update
    }

    return NextResponse.json({ message: `E-mail de ${updated.name} atualizado com sucesso.`, user: updated });
  } catch (error) {
    console.error("update user email error:", error);
    return NextResponse.json({ message: "Erro ao atualizar e-mail." }, { status: 500 });
  }
}
