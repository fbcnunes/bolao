import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// The root page redirects to the app or login
export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  redirect("/");
}
