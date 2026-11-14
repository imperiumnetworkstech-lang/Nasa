"use client";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/misc";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Callout tone="danger" title="Something went wrong loading this page">
        The data could not be loaded. Your saved records are not affected. {error.digest ? <span className="text-xs">Reference: {error.digest}</span> : null}
      </Callout>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
