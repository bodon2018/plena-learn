import { cn } from "@/lib/cn";

type StatusBadgeProps = {
  /** Status value */
  status: string;
  /** Size variant */
  size?: "sm" | "md";
};

/**
 * Map status strings to visual variants.
 */
function getStatusVariant(status: string): {
  bg: string;
  text: string;
  label: string;
} {
  const normalized = status.toLowerCase().replace(/_/g, " ");

  // Success states
  if (
    normalized.includes("ready") ||
    normalized.includes("complete") ||
    normalized.includes("approved") ||
    normalized.includes("success")
  ) {
    return {
      bg: "bg-success/10",
      text: "text-success",
      label: normalized,
    };
  }

  // Warning/pending states
  if (
    normalized.includes("waiting") ||
    normalized.includes("pending") ||
    normalized.includes("draft")
  ) {
    return {
      bg: "bg-secondary/10",
      text: "text-secondary",
      label: normalized,
    };
  }

  // In-progress states
  if (
    normalized.includes("running") ||
    normalized.includes("processing") ||
    normalized.includes("drafting") ||
    normalized.includes("discovery")
  ) {
    return {
      bg: "bg-primary/10",
      text: "text-primary",
      label: normalized,
    };
  }

  // Error states
  if (
    normalized.includes("fail") ||
    normalized.includes("error") ||
    normalized.includes("reject")
  ) {
    return {
      bg: "bg-danger/10",
      text: "text-danger",
      label: normalized,
    };
  }

  // Default
  return {
    bg: "bg-neutral-100",
    text: "text-mute",
    label: normalized,
  };
}

/**
 * Status badge component for displaying job/item statuses.
 * Automatically colors based on status string content.
 */
export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const variant = getStatusVariant(status);

  return (
    <span
      className={cn(
        "inline-flex items-center",
        "rounded-lg",
        "font-medium capitalize",
        variant.bg,
        variant.text,
        size === "sm" && "px-2 py-0.5 text-caption-sm",
        size === "md" && "px-3 py-1 text-caption"
      )}
    >
      {variant.label}
    </span>
  );
}