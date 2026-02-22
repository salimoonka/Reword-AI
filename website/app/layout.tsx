import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Reword AI — Умный перефразировщик текста",
  description:
    "Перефразируйте текст с помощью искусственного интеллекта. СБП и банковские карты. Подписка Pro для безлимитного использования.",
  keywords: ["перефразирование", "AI", "рерайт", "текст", "Reword AI"],
  openGraph: {
    title: "Reword AI — Умный перефразировщик текста",
    description: "Перефразируйте текст с помощью ИИ. Подписка Pro — безлимитные перефразирования.",
    type: "website",
    locale: "ru_RU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
