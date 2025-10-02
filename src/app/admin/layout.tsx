/* CHANGE: Admin layout now imports the same global styles and font as the user area,
   so Tailwind utilities (btn-primary, bg-canvas, etc.) and tokens apply here too. */

import type { ReactNode } from "react";
import "@/app/globals.css"; // CHANGE: load shared styles into the admin tree

// CHANGE: match the user layout font so typography is consistent
import { Inter } from "next/font/google";
import AdminTopBar from "@/components/navigation/AdminTopBar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {/* CHANGE: apply the same canvas + ink tokens used in user; also apply font variable */}
      <body className={`${inter.variable} bg-canvas text-ink antialiased`}>
        <AdminTopBar />
        {/* CHANGE: same content container width as user area */}
        <main className="mx-auto max-w-4xl px-4 py-4">{children}</main>
      </body>
    </html>
  );
}
