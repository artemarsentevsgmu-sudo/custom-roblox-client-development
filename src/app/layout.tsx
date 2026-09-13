import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "NOVA — лаунчер Roblox нового поколения",
  description:
    "Красивая замена стандартному лаунчеру Roblox: баланс Robux, друзья, группы, инвентарь, браузер серверов с хостом, регионом и пингом.",
};

export const viewport: Viewport = {
  themeColor: "#05060d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
