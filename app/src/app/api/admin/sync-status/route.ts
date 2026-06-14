import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSyncStatuses } from "@/lib/sync-status";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "MASTER") {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  const statuses = await getSyncStatuses();

  return NextResponse.json({
    odds: statuses.odds?.toISOString() ?? null,
    matches: statuses.matches?.toISOString() ?? null,
    results: statuses.results?.toISOString() ?? null,
  });
}
