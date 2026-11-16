import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Orbitron } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/toaster";
import { PwaRegister } from "@/components/pwa-register";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", weight: ["400", "500", "600", "700", "800", "900"] });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: {
    default: "NexoryOS GameZone OS — Gaming Zone Management & PC Control",
    template: "%s · NexoryOS GameZone OS",
  },
  description:
    "The complete OS for gaming zones, VR arenas & esports cafés — every session billed, every hour filled.",
  keywords: ["gaming zone software", "gaming cafe billing", "PC control", "esports lounge", "VR arena", "booking", "NexoryOS", "GameZone OS"],
  authors: [{ name: "NexoryOS" }],
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NexoryOS",
  },
  openGraph: {
    title: "NexoryOS GameZone OS",
    description: "Complete Gaming Zone Management & PC Control Platform — every session billed, every hour filled.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e1a",
  viewportFit: "cover",
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
        <PwaRegister />
      </body>
    </html>
  );
}
