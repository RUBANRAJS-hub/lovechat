import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ForeverUs | AI-Powered Couple Communication Platform",
  description: "Secure private messaging, WebRTC calling, memories vault, quizzes, and relationship analytics for couples.",
  keywords: "couple chat, secure couple, relationship tracking, couples game, love quiz, E2EE chat",
  icons: {
    icon: "/favicon.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Google Fonts integration and layout details */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="min-h-full flex flex-col bg-[#060212] text-[#f3f1f7]" suppressHydrationWarning>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
