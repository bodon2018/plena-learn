"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  User,
  Users,
  Database,
  BarChart3,
  PieChart,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Navigation items for admin sidebar.
 */
const navItems: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/admin/account", label: "Account", icon: User },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/data_sources", label: "Data Sources", icon: Database },
  { href: "/admin/metrics", label: "Metrics", icon: BarChart3 },
  { href: "/admin/results_and_visualizations", label: "Results", icon: PieChart },
];

/**
 * Admin sidebar navigation.
 * 
 * Design principles:
 * - Always visible (admins use desktop)
 * - Professional, clean aesthetic
 * - Clear active state indication
 * - Wider than user sidebar to accommodate longer labels
 */
export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        // Fixed width - slightly wider than user sidebar for admin labels
        "w-72",
        // Full height, sticky positioning
        "h-screen sticky top-0",
        // Subtle separation from content area
        "border-r border-neutral-200/60",
        // Clean white background
        "bg-white",
        // Internal layout
        "flex flex-col"
      )}
    >
      {/*
        =====================================================
        BRAND HEADER
        =====================================================
      */}
      <div className="px-6 py-6 border-b border-neutral-100">
        <Link href="/admin/account" className="flex items-center gap-3">
          {/* Plena logo */}
          <Image
            src="/plena-logo.png"
            alt="Plena logo"
            width={40}
            height={40}
            className="rounded-xl"
            priority
          />
          {/* Brand name + admin badge */}
          <div>
            <span className="text-xl font-semibold text-ink tracking-tight">
              Plena
            </span>
            <span
              className={cn(
                "ml-2 px-2 py-0.5 rounded-md",
                "text-caption-sm font-semibold uppercase",
                "bg-primary/10 text-primary"
              )}
            >
              Admin
            </span>
          </div>
        </Link>
      </div>

      {/*
        =====================================================
        NAVIGATION LINKS
        =====================================================
      */}
      <nav className="flex-1 px-4 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Check if current path starts with this href
            const isActive = pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  // Base layout
                  "flex items-center gap-3 px-4 py-3 rounded-xl",
                  // Typography
                  "text-ui",
                  // Smooth transition
                  "transition-all duration-150",
                  // Active state
                  isActive && [
                    "bg-primary/10",
                    "text-primary",
                    "font-semibold",
                  ],
                  // Inactive state
                  !isActive && [
                    "text-mute",
                    "hover:bg-neutral-100",
                    "hover:text-ink",
                  ]
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    isActive ? "stroke-[2.5]" : "stroke-[2]"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/*
        =====================================================
        FOOTER
        =====================================================
      */}
      <div className="px-4 py-4 border-t border-neutral-100">
        {/* Switch to User View link */}
        <Link
          href="/user/account"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl",
            "text-ui text-mute",
            "hover:bg-neutral-100 hover:text-ink",
            "transition-all duration-150"
          )}
        >
          <Users className="w-5 h-5" />
          <span>Switch to User View</span>
        </Link>

        {/* Logout */}
        <button
          type="button"
          onClick={() => {
            // TODO: Implement actual logout logic
            console.log("Admin logout clicked");
          }}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl",
            "text-ui text-mute",
            "hover:bg-danger/5 hover:text-danger",
            "transition-all duration-150"
          )}
        >
          <LogOut className="w-5 h-5" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Version footer */}
      <div className="px-6 py-4 border-t border-neutral-100">
        <p className="text-caption text-subtle">
          Plena Admin v1.0.0
        </p>
      </div>
    </aside>
  );
}