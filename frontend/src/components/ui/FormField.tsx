import { cn } from "@/lib/cn";
import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";

type BaseFieldProps = {
  /** Field label */
  label: string;
  /** Whether the field is required */
  required?: boolean;
  /** Help text below the input */
  helpText?: string;
  /** Error message */
  error?: string;
  /** Additional CSS classes for the container */
  className?: string;
};

type InputFieldProps = BaseFieldProps & {
  type: "text" | "email" | "password" | "number" | "url";
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

type TextareaFieldProps = BaseFieldProps & {
  type: "textarea";
  rows?: number;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows">;

type SelectFieldProps = BaseFieldProps & {
  type: "select";
  children: ReactNode;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "children">;

type FormFieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps;

/**
 * Shared input styling
 */
const inputBaseStyles = cn(
  "w-full",
  "px-4 py-3",
  "rounded-xl",
  "border border-neutral-200",
  "bg-white",
  "text-body-sm text-ink",
  "placeholder:text-subtle",
  "transition-all duration-150",
  "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10",
  "disabled:bg-neutral-50 disabled:text-mute disabled:cursor-not-allowed"
);

const inputErrorStyles = "border-danger focus:border-danger focus:ring-danger/10";

/**
 * Reusable form field component with consistent styling.
 * 
 * Supports:
 * - Text, email, password, number, url inputs
 * - Textarea
 * - Select dropdown
 * - Labels, help text, and error states
 */
export default function FormField(props: FormFieldProps) {
  const { label, required, helpText, error, className, type, ...rest } = props;

  const inputId = `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const hasError = Boolean(error);

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Label */}
      <label
        htmlFor={inputId}
        className="block text-ui font-medium text-ink"
      >
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>

      {/* Input element */}
      {type === "textarea" ? (
        <textarea
          id={inputId}
          rows={(rest as TextareaFieldProps).rows ?? 4}
          className={cn(
            inputBaseStyles,
            "min-h-[100px] resize-y",
            hasError && inputErrorStyles
          )}
          {...(rest as Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows">)}
        />
      ) : type === "select" ? (
        <select
          id={inputId}
          className={cn(
            inputBaseStyles,
            "cursor-pointer",
            hasError && inputErrorStyles
          )}
          {...(rest as Omit<SelectHTMLAttributes<HTMLSelectElement>, "children">)}
        >
          {(props as SelectFieldProps).children}
        </select>
      ) : (
        <input
          id={inputId}
          type={type}
          className={cn(
            inputBaseStyles,
            hasError && inputErrorStyles
          )}
          {...(rest as Omit<InputHTMLAttributes<HTMLInputElement>, "type">)}
        />
      )}

      {/* Help text */}
      {helpText && !hasError && (
        <p className="text-caption text-mute">{helpText}</p>
      )}

      {/* Error message */}
      {hasError && (
        <p className="text-caption text-danger">{error}</p>
      )}
    </div>
  );
}