// CHANGE: Separate layout for /admin routes. Keeps admin UI isolated at /admin/*.

import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Plena Admin",
  description: "Plena admin console",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-5xl px-6 py-6 min-h-[100dvh] bg-neutral-50">
          {children}
        </div>
      </body>
    </html>
  );
}
