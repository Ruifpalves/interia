import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import { PosthogProvider } from "@/components/app/PosthogProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Interia — Plataforma de design de interiores assistida por IA",
  description:
    "Estúdios de design produzem projetos completos de apresentação a clientes em 30 minutos, em vez de 30 horas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-PT" className={`${inter.variable} ${playfair.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <PosthogProvider />
        </Suspense>
        {children}
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
