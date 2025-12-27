"use client";

import type { ReactNode } from "react";
import AdminSidebar from "@/components/navigation/AdminSidebar";

/**
 * Admin layout - wraps all /admin/* pages.
 * 
 * Design decisions:
 * - Admins primarily use desktop, so sidebar is always visible
 * - Wider content area than user pages (admins work with data tables, forms)
 * - No bottom tab bar (desktop-first)
 * - Clean, professional aesthetic
 * 
 * Note: No <html> or <body> tags here - root layout handles those.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar - always visible for admin */}
      <AdminSidebar />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        {/*
          Content wrapper:
          - p-6 lg:p-8: Comfortable padding
          - max-w-6xl: Wider than user pages for data-heavy content
          - mx-auto: Center content
        */}
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}