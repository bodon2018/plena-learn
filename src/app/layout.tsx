// CHANGE: Added BottomTabBar globally so it appears on every route,
// and made the content container responsive (mobile-first but nicer on desktop).

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomTabBar from "@/components/navigation/BottomTabBar";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Plena",
  description: "Plena Learn",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased min-h-[100dvh] bg-neutral-50`}>
        <div className="mx-auto w-full max-w-screen-sm px-3 pb-24 pt-3 sm:max-w-screen-md md:max-w-lg">
          {/* CHANGE: Responsive container (mobile → md) */}
          {children}
        </div>
        <div className="h-16" />
        <BottomTabBar /> {/* CHANGE: Persistent bottom nav across all pages */}
      </body>
    </html>
  );
}

