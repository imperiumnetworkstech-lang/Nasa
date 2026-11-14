"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export interface SearchItem {
  label: string;
  href: string;
  group: string;
  keywords?: string;
}

/** Global search (Ctrl/⌘+K) across routes, help, library and records the user may access. */
export function CommandPalette({ items }: { items: SearchItem[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const r = t ? items.filter((i) => `${i.label} ${i.group} ${i.keywords ?? ""}`.toLowerCase().includes(t)) : items.slice(0, 12);
    return r.slice(0, 20);
  }, [q, items]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-line/60 bg-surface px-4 text-sm text-muted shadow-[var(--shadow-card)] hover:text-primary md:w-44"
        aria-label="Search (Ctrl+K)"
      >
        <Search aria-hidden className="h-4 w-4" />
        <span className="hidden md:inline">Search</span>
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        className="mx-auto mt-[10vh] w-[min(94vw,36rem)] rounded-2xl border border-line bg-surface p-0 text-fg backdrop:bg-navy/50"
        aria-label="Search"
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search aria-hidden className="h-4 w-4 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                go(results[active].href);
              }
            }}
            placeholder="Search pages, help, library, records…"
            className="h-14 w-full bg-transparent text-base outline-none"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmd-results"
            aria-activedescendant={results[active] ? `cmd-${active}` : undefined}
          />
        </div>
        <ul id="cmd-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted">No matches.</li> : null}
          {results.map((r, i) => (
            <li
              key={r.href + r.label}
              id={`cmd-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r.href)}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${i === active ? "bg-primary-soft text-primary" : ""}`}
            >
              <span className="truncate">{r.label}</span>
              <span className="shrink-0 text-xs text-muted">{r.group}</span>
            </li>
          ))}
        </ul>
        <p className="border-t border-line px-4 py-2 text-xs text-muted">↑↓ to move · Enter to open · Esc to close</p>
      </dialog>
    </>
  );
}
