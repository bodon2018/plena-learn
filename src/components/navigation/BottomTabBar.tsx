"use client";
// CHANGE: Converted to use Next.js routing + renamed tabs (Play→Account, Metrics→Progress)
// and made it reusable across all pages. Active tab is detected via usePathname.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, Target, Mic, BarChart3 } from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/account",  label: "Account",  icon: Home },       // CHANGE: was Play → now Account
  { href: "/category", label: "Category", icon: ListChecks },
  { href: "/progress", label: "Progress", icon: Target },     // CHANGE: was Metrics → now Progress
  { href: "/session",  label: "Session",  icon: Mic },
  { href: "/summary",  label: "Summary",  icon: BarChart3 },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-screen-sm border-t bg-white/90 backdrop-blur">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex h-14 w-full flex-col items-center justify-center gap-1 text-[11px]",
                  active ? "text-blue-600" : "text-neutral-500"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
