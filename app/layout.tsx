import type { Metadata } from "next";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Linux Practice Lab — learn Linux in your browser",
  description:
    "An interactive, browser-based Linux practice environment for students, powered by Vercel Sandbox. No install required.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LangProvider>
          <Header />
          <main className="main">{children}</main>
        </LangProvider>
      </body>
    </html>
  );
}
