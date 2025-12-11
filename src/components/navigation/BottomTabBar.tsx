"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Home, Mic, Brain, Film } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  // Progress tab is now "Library". Routes stay the same for now.
  const navItems = [
    { href: "/user/account", label: "Account", icon: Home },
    // Use a film-strip icon to represent the media library / repository
    { href: "/user/progress", label: "Library", icon: Film },
    { href: "/user/session", label: "Session", icon: Mic },
    // Use a brain icon for the Learn tab
    { href: "/user/learn", label: "Learn", icon: Brain },
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
                  "flex flex-col items-center gap-0.5 px-3 py-2 text-xs",
                  active ? "text-primary" : "text-neutral-400",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
