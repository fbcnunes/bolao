import type { Metadata } from "next";
import { Outfit, Rubik } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bolão Copa 2026",
  description: "Bolão exclusivo para a Copa do Mundo 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} ${rubik.variable}`} suppressHydrationWarning>
      <body className="antialiased min-h-screen selection:bg-brand-primary/30" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <div className="fixed inset-0 z-[-1]" style={{ background: "var(--bg-base)" }}></div>
        {children}
      </body>
    </html>
  );
}
