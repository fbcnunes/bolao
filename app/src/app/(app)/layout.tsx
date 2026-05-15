import Providers from "@/components/Providers";
import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="min-h-screen pb-20">
        {children}
      </div>
      <BottomNav />
    </Providers>
  );
}
