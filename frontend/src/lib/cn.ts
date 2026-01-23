import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names with support for:
 * - Conditional classes (falsy values are filtered out)
 * - Nested arrays of class names
 * - Tailwind class merging (later classes override earlier conflicting ones)
 *
 * @example
 * cn("px-4", isActive && "bg-blue-500", ["text-white", "font-bold"])
 * // => "px-4 bg-blue-500 text-white font-bold" (if isActive is true)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}