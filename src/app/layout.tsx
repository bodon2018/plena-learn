// src/app/layout.tsx

import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Plena Learn",
  description: "Youth sports learning app",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
