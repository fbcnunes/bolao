import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ message: "E-mail inválido." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Always return success to avoid email enumeration
    if (!user || user.status === "REMOVIDO") {
      return NextResponse.json({ message: "Se este e-mail estiver cadastrado, você receberá as instruções em breve." });
    }

    // Invalidate previous unused tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
    const resetUrl = `${baseUrl}/redefinir-senha?token=${token}`;

    await sendPasswordResetEmail(user.email, user.name, resetUrl);

    return NextResponse.json({ message: "Se este e-mail estiver cadastrado, você receberá as instruções em breve." });
  } catch (error) {
    console.error("forgot-password error:", error);
    return NextResponse.json({ message: "Erro ao processar solicitação." }, { status: 500 });
  }
}
