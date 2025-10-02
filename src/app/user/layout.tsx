

// CHANGE: Layout for all /user routes. This was previously under a route group.
// No visual change; it just scopes the bottom nav + page chrome to /user/*.

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import BottomTabBar from "@/components/navigation/BottomTabBar";

export const metadata: Metadata = {
  title: "Plena",
  description: "Plena user experience",
};

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-sm px-3 pb-24 pt-3 min-h-[100dvh] bg-neutral-50">
          {children}
        </div>
        <div className="h-16" />
        <BottomTabBar /> {/* stays fixed at bottom */}
      </body>
    </html>
  );
}


