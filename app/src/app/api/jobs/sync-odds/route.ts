import { NextResponse } from "next/server";
import { syncWorldCupOdds } from "@/lib/sync-odds";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
  }

  try {
    const { syncedCount, skippedCount } = await syncWorldCupOdds();

    return NextResponse.json({
      message: "Odds sincronizadas com sucesso",
      syncedCount,
      skippedCount,
    });
  } catch (error) {
    console.error("sync-odds error:", error);
    return NextResponse.json(
      { message: "Erro ao sincronizar odds", error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
