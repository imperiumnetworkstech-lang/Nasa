import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "hero-gradient text-white shadow-[var(--shadow-pop)] hover:brightness-105",
  secondary: "bg-primary-soft text-primary hover:brightness-95",
  outline: "border border-line bg-surface text-fg hover:bg-surface-2",
  ghost: "text-primary hover:bg-primary-soft",
  danger: "bg-danger text-white hover:brightness-110",
  dark: "bg-navy text-white hover:bg-midnight",
  light: "bg-white text-violet shadow-sm hover:bg-lavender",
};
const sizes = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-base gap-2",
  icon: "h-10 w-10 justify-center",
};

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]",
    variants[variant],
    sizes[size],
    className,
  );
}

/** Button with an optional loading state (spinner + disabled + aria-busy). */
export function Button({ variant, size, className, type = "button", loading, children, disabled, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean }) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
