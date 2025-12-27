"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Home, Mic, Brain, Film } from "lucide-react";

/**
 * Navigation items - same as BottomTabBar for consistency.
 * Using a shared array keeps both navs in sync.
 */
const navItems = [
  { href: "/user/account", label: "Account", icon: Home },
  { href: "/user/library", label: "Library", icon: Film },
  { href: "/user/session", label: "Session", icon: Mic },
  { href: "/user/learn", label: "Learn", icon: Brain },
];

/**
 * Sidebar navigation for tablet and desktop views.
 * 
 * Design principles (Apple-inspired):
 * - Generous whitespace
 * - Subtle hover/active states
 * - Clean typography hierarchy
 * - Minimal visual noise
 */
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        // Fixed width - wide enough for labels but not wasteful
        "w-64",
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
        Logo/name at the top of the sidebar
        =====================================================
      */}
      <div className="px-6 py-8">
        <Link href="/user/account" className="flex items-center gap-3">
          {/* Plena logo from public folder */}
          <Image
            src="/plena-logo.png"
            alt="Plena logo"
            width={36}
            height={36}
            className="rounded-lg"
            priority
          />
          {/* Brand name */}
          <span className="text-xl font-semibold text-ink tracking-tight">
            Plena
          </span>
        </Link>
      </div>

      {/*
        =====================================================
        NAVIGATION LINKS
        Main navigation items with icons and labels
        =====================================================
      */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    // Base layout
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl",
                    // Typography
                    "text-sm font-medium",
                    // Smooth transition for hover/active states
                    "transition-all duration-150",
                    // Active state: filled background, primary color
                    isActive && [
                      "bg-primary/10",
                      "text-primary",
                    ],
                    // Inactive state: subtle hover
                    !isActive && [
                      "text-mute",
                      "hover:bg-neutral-100",
                      "hover:text-ink",
                    ]
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      // Icon gets slightly heavier stroke when active
                      isActive ? "stroke-[2.5]" : "stroke-[2]"
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/*
        =====================================================
        FOOTER AREA
        Optional: user info, settings, logout
        Keeping minimal for now
        =====================================================
      */}
      <div className="px-6 py-6 border-t border-neutral-200/60">
        <p className="text-xs text-mute">
          Plena Learn
        </p>
      </div>
    </aside>
  );
}