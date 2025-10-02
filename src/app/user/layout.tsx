// CHANGE: This layout wraps ALL /user/* pages and re-applies the mobile-first shell
// (background color, max width, side padding, and bottom space for the tab bar).
// This resolves the "background behind the cards is not the proper color".

import type { Metadata } from "next";
import "@/app/globals.css";
import BottomTabBar from "@/components/navigation/BottomTabBar";

export const metadata: Metadata = {
  title: "Plena",
  description: "Plena user experience",
};

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* CHANGE: put the background color on <body> so it’s consistent across pages */}
      <body className="bg-neutral-50">
        {/* CHANGE: center the content, add horizontal padding, top padding, and
           bottom padding to avoid overlapping the bottom tab bar. */}
        <div className="mx-auto max-w-sm px-3 pb-24 pt-3 min-h-[100dvh]">
          {children}
        </div>

        {/* space holder (safe area), then the bottom tabs */}
        <div className="h-16" />
        <BottomTabBar />
      </body>
    </html>
  );
}



