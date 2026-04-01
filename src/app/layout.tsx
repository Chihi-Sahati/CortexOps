import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "../styles/variables.css";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CortexOps - Secure Agentic Workflow Automation Engine",
  description: "AI-powered workflow automation with intelligent agents, self-healing connectors, and advanced security. Build, deploy, and monitor automated workflows with natural language.",
  keywords: ["CortexOps", "Workflow Automation", "AI Agents", "Low-Code", "No-Code", "Zapier Alternative", "n8n Alternative"],
  authors: [{ name: "CortexOps Team" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-slate-950 text-slate-50`}
      >
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
