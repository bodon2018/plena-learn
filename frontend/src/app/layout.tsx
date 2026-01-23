import "./globals.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

/**
 * Configure Inter font from Google Fonts.
 * - `subsets: ["latin"]` keeps bundle size down
 * - `variable: "--font-inter"` creates a CSS custom property
 *   that Tailwind references in the fontFamily config
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap", // Prevents invisible text while font loads
});

export const metadata = {
  title: "Plena Learn",
  description: "Youth sports learning app",
};

/**
 * Root layout - wraps the entire application.
 * This is the ONLY place <html> and <body> tags should appear.
 * All other layouts (user, admin) should return fragments or divs.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      {/*
        Base body styling:
        - font-sans: Uses Inter via the CSS variable
        - antialiased: Smooths font rendering (Apple-style)
        - bg-surface: Light gray background from your palette
        - text-ink: Dark charcoal text from your palette
        - min-h-screen: Ensures body fills viewport for sticky footers etc.
      */}
      <body className="font-sans antialiased bg-surface text-ink min-h-screen">
        {children}
      </body>
    </html>
  );
}