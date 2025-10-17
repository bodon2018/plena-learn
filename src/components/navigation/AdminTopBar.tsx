// src/components/navigation/AdminTopBar.tsx
"use client";

/* CHANGE: Top nav for Admin. Uses the same neutral styles as user AppBar.
   Tabs: Account, Materials, Metrics, Dashboard. Plena + logo at far right. */

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/admin/account", label: "Account" },
  { href: "/admin/materials", label: "Materials" },
  { href: "/admin/users", label: "Users" }, // (from earlier step)
  { href: "/admin/metrics", label: "Metrics" },
  { href: "/admin/transparency", label: "Transparency" }, // CHANGE: add Transparency tab
  { href: "/admin/dashboard", label: "Dashboard" },
];

export default function AdminTopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-2">
        <nav className="flex items-center gap-2">
          {LINKS.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition",
                  active
                    ? "bg-neutral-100 font-semibold text-ink"
                    : "text-neutral-600 hover:bg-neutral-50"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Plena name + logo at far right */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-700">Plena</span>
          <Image
            src="/plena-logo.png"
            alt="Plena"
            width={18}
            height={18}
            className="rounded-full"
            priority
          />
        </div>
      </div>
    </header>
  );
}
