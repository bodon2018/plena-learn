"use client";

import type { ReactNode } from "react";
import BottomTabBar from "@/components/navigation/BottomTabBar";
import Sidebar from "@/components/navigation/Sidebar";

/**
 * User layout - wraps all /user/* pages.
 * 
 * Responsive behavior:
 * - Mobile (< 768px): Bottom tab navigation, full-width content
 * - Tablet/Desktop (>= 768px): Sidebar navigation on left, centered content
 * 
 * Note: No <html> or <body> tags here - root layout handles those.
 */
export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {/*
        =====================================================
        TABLET/DESKTOP LAYOUT (>= 768px)
        Sidebar on left, content area on right
        Hidden on mobile via "hidden md:flex"
        =====================================================
      */}
      <div className="hidden md:flex min-h-screen">
        {/* Sidebar - fixed width on left side */}
        <Sidebar />

        {/* 
          Main content area - takes remaining width
          - flex-1: Fills available horizontal space
          - p-8 lg:p-12: Generous padding that increases on larger screens
          - overflow-y-auto: Scrolls independently if content is tall
        */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-12">
          {/*
            Content wrapper - constrains width for readability
            - max-w-3xl: ~768px max width keeps text comfortable to read
            - mx-auto: Centers the content in the available space
          */}
          <div className="max-w-3xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/*
        =====================================================
        MOBILE LAYOUT (< 768px)
        Full-width content with bottom tab navigation
        Hidden on tablet/desktop via "md:hidden"
        =====================================================
      */}
      <div className="md:hidden min-h-screen flex flex-col">
        {/*
          Mobile content area
          - flex-1: Takes all available vertical space above the tab bar
          - px-4: 16px horizontal padding (breathing room without wasting space)
          - pt-4: Top padding for status bar / notch clearance
          - pb-24: Bottom padding to prevent content hiding behind tab bar
        */}
        <main className="flex-1 px-4 pt-4 pb-24">
          {children}
        </main>

        {/* Bottom tab bar - fixed to bottom of screen */}
        <BottomTabBar />
      </div>
    </div>
  );
}