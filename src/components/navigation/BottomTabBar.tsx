"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Home, Activity, Mic, BarChart } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  // CHANGE: All hrefs now include the "/user" segment
  const navItems = [
    { href: "/user/account",  label: "Account",  icon: Home },
    { href: "/user/progress", label: "Progress", icon: Activity },
    { href: "/user/session",  label: "Session",  icon: Mic },
    { href: "/user/summary",  label: "Summary",  icon: BarChart },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-sm border-t bg-white/90 backdrop-blur">
      <ul className="flex justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex h-14 w-20 flex-col items-center justify-center gap-1 text-[11px]",
                  active ? "text-blue-600" : "text-neutral-500"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
