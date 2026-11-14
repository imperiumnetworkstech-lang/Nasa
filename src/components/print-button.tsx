"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Print / save as PDF" }: { label?: string }) {
  return (
    <Button onClick={() => window.print()} className="no-print">
      <Printer aria-hidden className="h-4 w-4" /> {label}
    </Button>
  );
}
