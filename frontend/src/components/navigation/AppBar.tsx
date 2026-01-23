"use client";
// CHANGE: Keep the simplified AppBar (no hamburger), but align styles with the design system.

import Image from "next/image";

export default function AppBar({ title }: { title?: string }) {
  return (
    <div className="sticky top-0 z-30 -mx-3 mb-3 flex items-center gap-3 border-b bg-white/80 px-3 py-2 backdrop-blur">
      <div className="font-semibold tracking-tight text-ink">{title ?? "Plena"}</div>
      <div className="ml-auto flex items-center gap-2 text-xs text-ink">
        {/* CHANGE: Brand at top-right per system */}
        <span className="font-medium">Plena</span>
        <Image
          src="/plena-logo.png"
          alt="Plena logo"
          width={18}
          height={18}
          className="inline-block"
          priority
        />
      </div>
    </div>
  );
}
