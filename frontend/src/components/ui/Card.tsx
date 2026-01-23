import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type CardProps = {
  /** Additional CSS classes to apply to the card container */
  className?: string;
  /** Card contents */
  children: ReactNode;
  /** 
   * Whether to include internal padding. 
   * Set to false if you need edge-to-edge content (images, custom layouts).
   * @default true 
   */
  padded?: boolean;
  /**
   * Whether the card should animate in with fade-up effect.
   * Use sparingly - typically for cards that appear after page load.
   * @default false
   */
  animated?: boolean;
  /**
   * Whether the card is interactive (clickable).
   * Adds hover shadow effect and cursor pointer.
   * @default false
   */
  interactive?: boolean;
};

/**
 * Card component - elevated surface for grouping related content.
 * 
 * Design principles:
 * - Clean white background with subtle border
 * - Soft shadow for depth without heaviness
 * - Generous border radius for friendly feel
 * - Flexible padding options for different content types
 * 
 * @example
 * // Standard card with padding
 * <Card>Content here</Card>
 * 
 * @example
 * // Card with image that goes edge-to-edge
 * <Card padded={false}>
 *   <img src="..." className="rounded-t-2xl" />
 *   <div className="p-5">Caption</div>
 * </Card>
 * 
 * @example
 * // Interactive card that responds to hover
 * <Card interactive onClick={handleClick}>
 *   Clickable content
 * </Card>
 */
export default function Card({
  className,
  children,
  padded = true,
  animated = false,
  interactive = false,
}: CardProps) {
  return (
    <div
      className={cn(
        // Base card styles from globals.css
        "card",
        // Optional hover effect for interactive cards
        interactive && "hover:shadow-lift cursor-pointer",
        // Optional entrance animation
        animated && "animate-fade-up",
        // Custom classes passed by parent
        className
      )}
    >
      {/* 
        Conditional padding wrapper.
        When padded=true, content gets comfortable internal spacing.
        When padded=false, children control their own spacing.
      */}
      {padded ? (
        <div className="p-5">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}