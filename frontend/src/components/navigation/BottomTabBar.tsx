"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Home, Mic, Brain, Film } from "lucide-react";

/**
 * Navigation items - shared definition for consistency with Sidebar.
 * If you find yourself updating this in multiple places,
 * consider extracting to a shared config file.
 */
const navItems = [
  { href: "/user/account", label: "Account", icon: Home },
  { href: "/user/library", label: "Library", icon: Film },
  { href: "/user/session", label: "Session", icon: Mic },
  { href: "/user/learn", label: "Learn", icon: Brain },
];

/**
 * Bottom tab bar navigation for mobile views.
 * 
 * Design principles (Apple-inspired):
 * - Minimum 44px touch targets
 * - Clear active state (not just color)
 * - Subtle blur effect for layered feel
 * - Safe area padding for notched devices
 */
export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        // Fixed positioning at bottom
        "fixed inset-x-0 bottom-0 z-30",
        // No max-width constraint - spans full width
        // Background with blur for depth
        "bg-white/80 backdrop-blur-lg",
        // Top border for subtle separation
        "border-t border-neutral-200/60",
        // Safe area padding for devices with home indicators
        "pb-safe"
      )}
    >
      {/* 
        Inner container adds horizontal padding
        This keeps touch targets away from screen edges
      */}
      <div className="px-2">
        <ul className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    // Flex column for icon + label stacking
                    "flex flex-col items-center justify-center",
                    // Minimum touch target: 44px height (Apple HIG)
                    "min-h-[52px] py-2",
                    // Typography
                    "text-[11px] font-medium",
                    // Smooth transitions
                    "transition-all duration-150",
                    // Gap between icon and label
                    "gap-1"
                  )}
                >
                  {/* 
                    Icon container - allows for active state background
                    without affecting the overall touch target
                  */}
                  <div
                    className={cn(
                      // Pill shape for active indicator
                      "flex items-center justify-center",
                      "h-7 w-12 rounded-full",
                      // Transition for smooth state changes
                      "transition-all duration-200",
                      // Active: subtle primary background
                      isActive && "bg-primary/10",
                      // Inactive: transparent (no background)
                      !isActive && "bg-transparent"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        // Transition for color change
                        "transition-colors duration-150",
                        // Active: primary color with heavier stroke
                        isActive && "text-primary stroke-[2.5]",
                        // Inactive: muted gray
                        !isActive && "text-neutral-400 stroke-[2]"
                      )}
                    />
                  </div>
                  
                  {/* Label */}
                  <span
                    className={cn(
                      "transition-colors duration-150",
                      isActive ? "text-primary" : "text-neutral-400"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}