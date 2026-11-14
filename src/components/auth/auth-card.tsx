import type { ReactNode } from "react";
import { PublicPage } from "@/components/public-chrome";

export function AuthCard({ title, subtitle, children, aside }: { title: string; subtitle?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <PublicPage>
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
        {aside ? <div className="space-y-4">{aside}</div> : null}
      </div>
    </PublicPage>
  );
}
