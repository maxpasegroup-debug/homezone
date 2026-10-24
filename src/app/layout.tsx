import type { Metadata } from "next";
import { FloatingAICompanion } from "@/components/ai/floating-ai-companion";
import "./globals.css";

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
      <body>
        {children}
        <FloatingAICompanion />
      </body>
    </html>
  );
}
