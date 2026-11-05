import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Orbitron } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", weight: ["400", "500", "600", "700", "800", "900"] });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: {
    default: "GAMINOS by Nexoryos — Gaming Zone Operating System",
    template: "%s · GAMINOS",
  },
  description:
    "The complete OS for gaming zones, VR arenas & esports cafés — every session billed, every hour filled.",
  keywords: ["gaming zone software", "PS5 lounge", "VR arena", "esports café", "billing", "GAMINOS", "Nexoryos"],
  authors: [{ name: "Nexoryos" }],
  icons: { icon: "/nexoryos.png" },
  openGraph: {
    title: "GAMINOS by Nexoryos",
    description: "Every session billed, every hour filled.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e1a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${orbitron.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
