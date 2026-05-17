"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { BolaoProvider } from "@/contexts/BolaoContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SessionProvider>
        <BolaoProvider>{children}</BolaoProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
