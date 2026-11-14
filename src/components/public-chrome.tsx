import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <nav aria-label="Public" className="flex items-center gap-1 text-sm">
          <Link href="/privacy" className="hidden rounded-lg px-3 py-2 text-muted hover:text-fg sm:inline">
            Privacy & safety
          </Link>
          <ButtonLink href="/login" variant="outline" size="sm">
            Sign in
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} Antariksha · Research & simulation software. Not a medical device. Not affiliated with or endorsed by NASA.</p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/privacy" className="hover:text-fg">
            Privacy
          </Link>
          <Link href="/register" className="hover:text-fg">
            Register
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
