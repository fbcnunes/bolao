import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { syncWorldCupOdds } from "@/lib/sync-odds";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "MASTER") {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  try {
    const result = await syncWorldCupOdds();
    return NextResponse.json({
      message: "Odds sincronizadas com sucesso",
      ...result,
    });
  } catch (error) {
    console.error("admin sync-odds error:", error);
    return NextResponse.json(
      { message: "Erro ao sincronizar odds", error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
