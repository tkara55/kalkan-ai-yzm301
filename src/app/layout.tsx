import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KalkanAI — Yapay Zekâ Destekli Güvenlik Taraması",
  description:
    "KOBİ ve esnafın web sitelerini KVKK odaklı, etik ve pasif bir şekilde tarayan yapay zekâ destekli güvenlik asistanı.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <head>
        {/* Demo: uygulamanın kendi yerel adresi için sahiplik doğrulama etiketi */}
        <meta name="kalkan-verify" content="kalkan-46e86db411fbed803e7d3076" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
