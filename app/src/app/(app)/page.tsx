import TopBar from "@/components/TopBar";
import HomeClient from "@/components/HomeClient";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <TopBar title="Bolão Copa 2026" />
      <main className="max-w-lg mx-auto px-4 pt-4 pb-4">
        <HomeClient />
      </main>
    </div>
  );
}
