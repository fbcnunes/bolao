import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { sendPasswordChangedEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ message: "Token inválido." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ message: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json({ message: "Link de recuperação inválido." }, { status: 400 });
    }

    if (resetToken.usedAt) {
      return NextResponse.json({ message: "Este link já foi utilizado." }, { status: 400 });
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json({ message: "Este link expirou. Solicite um novo." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
    ]);

    await sendPasswordChangedEmail(resetToken.user.email, resetToken.user.name);

    return NextResponse.json({ message: "Senha redefinida com sucesso!" });
  } catch (error) {
    console.error("reset-password error:", error);
    return NextResponse.json({ message: "Erro ao redefinir senha." }, { status: 500 });
  }
}

// Validate token (GET) – used to show form or error page before user types new password
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valid: false, message: "Token ausente." });
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, message: "Link inválido ou expirado." });
  }

  return NextResponse.json({ valid: true });
}
