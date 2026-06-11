import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  try {
    const { name, currentPassword, newPassword, confirmPassword } = await req.json();
    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanCurrentPassword = typeof currentPassword === "string" ? currentPassword : "";
    const cleanNewPassword = typeof newPassword === "string" ? newPassword : "";
    const cleanConfirmPassword = typeof confirmPassword === "string" ? confirmPassword : "";

    if (!cleanName) {
      return NextResponse.json({ message: "Informe seu nome." }, { status: 400 });
    }

    if (cleanName.length < 2 || cleanName.length > 80) {
      return NextResponse.json({ message: "O nome deve ter entre 2 e 80 caracteres." }, { status: 400 });
    }

    if (cleanNewPassword || cleanConfirmPassword || cleanCurrentPassword) {
      if (!cleanCurrentPassword) {
        return NextResponse.json({ message: "Informe a senha atual para trocar a senha." }, { status: 400 });
      }

      if (cleanNewPassword.length < 6) {
        return NextResponse.json({ message: "A nova senha deve ter pelo menos 6 caracteres." }, { status: 400 });
      }

      if (cleanNewPassword !== cleanConfirmPassword) {
        return NextResponse.json({ message: "A confirmação da senha não confere." }, { status: 400 });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
    }

    const data: { name: string; passwordHash?: string } = { name: cleanName };

    if (cleanNewPassword) {
      const validCurrentPassword = await bcrypt.compare(cleanCurrentPassword, user.passwordHash);
      if (!validCurrentPassword) {
        return NextResponse.json({ message: "Senha atual incorreta." }, { status: 400 });
      }

      data.passwordHash = await bcrypt.hash(cleanNewPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({
      message: cleanNewPassword ? "Perfil e senha atualizados com sucesso." : "Perfil atualizado com sucesso.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ message: "Erro interno ao atualizar perfil." }, { status: 500 });
  }
}
