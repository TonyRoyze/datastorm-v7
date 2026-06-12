import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "@/components/app-shell";
import { PageContextProvider } from "@/components/page-context";
import { Chatbot } from "@/components/chatbot";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Datastorm — Marketing Dashboard",
  description: "Sri Lanka beverage distribution — latent demand & budget allocation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("h-full", "font-sans", inter.variable)} suppressHydrationWarning>
      <body className="h-full m-0">
        <ThemeProvider>
          <PageContextProvider>
            <TooltipProvider delayDuration={0}>
              <AppShell isOffline={!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY}>{children}</AppShell>
              <Chatbot />
            </TooltipProvider>
          </PageContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
