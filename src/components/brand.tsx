import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Antariksha brand logo (public/logo.jpeg, 1563×672).
 * The JPEG has a white background: `mix-blend-multiply` makes it disappear on light surfaces,
 * and in dark mode the image is inverted and screened so the ink shows as white.
 */
export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/logo.jpeg"
      alt="Antariksha"
      width={1563}
      height={672}
      priority={priority}
      className={cn("h-12 w-auto select-none mix-blend-multiply dark:mix-blend-screen dark:invert", className)}
    />
  );
}

/** Kept for places that need a compact mark (e.g. the offline page). */
export function LogoMark({ className }: { className?: string }) {
  return <Logo className={cn("h-16", className)} />;
}

export function Wordmark({ href = "/", className, tagline = true }: { href?: string; className?: string; invert?: boolean; tagline?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex flex-col items-start rounded-xl", className)} aria-label="Antariksha home">
      <Logo priority />
      {tagline ? <span className="mt-0.5 pl-1 text-[11px] text-muted">Monitor. Support. Thrive.</span> : null}
    </Link>
  );
}
