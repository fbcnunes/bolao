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
    <html lang="pt-BR" className={`${outfit.variable} ${rubik.variable} dark`}>
      <body className="antialiased min-h-screen bg-brand-dark text-white selection:bg-brand-primary/30">
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-brand-dark to-brand-dark"></div>
        {children}
      </body>
    </html>
  );
}
