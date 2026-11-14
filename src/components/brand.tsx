import Link from "next/link";
import { cn } from "@/lib/utils";

/** Original Antariksha mark: orbit ring + soft medical cross in a violet tile. Not affiliated with NASA. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("hero-gradient inline-flex h-10 w-10 items-center justify-center rounded-2xl shadow-[var(--shadow-pop)]", className)} aria-hidden>
      <svg viewBox="0 0 32 32" className="h-6 w-6">
        <ellipse cx="16" cy="16" rx="13" ry="6.5" transform="rotate(-28 16 16)" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.8" />
        <rect x="13.2" y="8.5" width="5.6" height="15" rx="2" fill="#fff" />
        <rect x="8.5" y="13.2" width="15" height="5.6" rx="2" fill="#fff" />
        <circle cx="26.6" cy="10.4" r="1.9" fill="#FFD27A" />
      </svg>
    </span>
  );
}

export function Wordmark({ href = "/", className, tagline = true }: { href?: string; className?: string; invert?: boolean; tagline?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 rounded-xl", className)} aria-label="Antariksha home">
      <LogoMark />
      <span className="leading-tight">
        <span className="block text-lg font-bold tracking-tight text-fg">Antariksha</span>
        {tagline ? <span className="block text-[11px] text-muted">Monitor. Support. Thrive.</span> : null}
      </span>
    </Link>
  );
}
