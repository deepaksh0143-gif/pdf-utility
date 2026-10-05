import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const BASE_STYLES =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 min-h-11 px-5",
  secondary:
    "bg-white text-ink-900 border border-border hover:bg-surface-muted min-h-11 px-5",
  ghost: "text-primary-700 hover:bg-primary-50 min-h-11 px-4",
  danger:
    "bg-danger-600 text-white hover:bg-red-700 active:bg-red-800 min-h-11 px-5",
};

const SIZES = {
  sm: "text-sm px-3 min-h-9",
  md: "",
  lg: "text-lg px-6 min-h-12",
};

interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: keyof typeof SIZES;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${BASE_STYLES} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}

interface LinkButtonProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  size?: keyof typeof SIZES;
  children: ReactNode;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={`${BASE_STYLES} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}
