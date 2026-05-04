import type { Metadata } from "next";
import { inter, geistMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Doctopus",
  description: "Logiciel de cabinet médical",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
