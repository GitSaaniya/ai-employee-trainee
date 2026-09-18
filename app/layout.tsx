import type { Metadata } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { DataProvider } from "@/components/layout/data-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const experienceDisplay = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-experience-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SkillSim AI",
  description: "AI-powered employee training and performance-readiness platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${experienceDisplay.variable} font-sans`} suppressHydrationWarning>
        <TooltipProvider>
          <DataProvider>{children}</DataProvider>
          <Toaster theme="dark" richColors position="top-right" closeButton />
        </TooltipProvider>
      </body>
    </html>
  );
}
