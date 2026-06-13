import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FloatingAICompanion } from "@/components/ai/floating-ai-companion";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "HomeZone | Your AI Property Companion",
  description:
    "India's most user-friendly AI-powered real estate platform for buying, selling, renting, investing, and marketing property.",
  metadataBase: new URL("https://homezone.ai")
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <FloatingAICompanion />
      </body>
    </html>
  );
}
