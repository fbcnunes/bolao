import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { GET as syncResults } from "@/app/api/jobs/sync-results/route";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "MASTER") {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  const headers = new Headers();
  if (process.env.CRON_SECRET) {
    headers.set("authorization", `Bearer ${process.env.CRON_SECRET}`);
  }

  const response = await syncResults(
    new Request("http://localhost/api/jobs/sync-results", { headers })
  );
  const data = await response.json();

  return NextResponse.json(data, { status: response.status });
}
