"use client";

import { Bot, Send, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

interface Answer {
  text: string;
  links: { label: string; href: string }[];
  sources: { label: string; at?: string }[];
  kind: string;
  engine?: string;
}

const SUGGESTIONS: Record<string, string[]> = {
  astronaut: ["How has my sleep been this week?", "Help me get ready to talk to my doctor", "Tips for stress"],
  medical: ["Where do I review alerts?", "What is the physiological-state model?", "Find sleep hygiene content"],
  commander: ["Where is the workload planner?", "What can I see about crew wellbeing?"],
  researcher: ["What is NASA OSDR?", "How was the model trained?"],
  admin: ["How do I configure thresholds?", "How do I simulate a communication delay?"],
};

export function GuidePanel({ role }: { role: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<{ q: string; a: Answer | { error: string } }[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    if (!question.trim()) return;
    setBusy(true);
    setQ("");
    try {
      const res = await fetch("/api/guide", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }) });
      const json = await res.json();
      setLog((l) => [...l, { q: question, a: res.ok ? (json as Answer) : { error: json.error ?? "The guide is unavailable." } }]);
    } catch {
      setLog((l) => [...l, { q: question, a: { error: "You appear to be offline. The guide needs a connection. Approved reference articles marked “Offline” remain in the library." } }]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="no-print hero-gradient fixed bottom-20 right-4 z-30 inline-flex h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white shadow-[var(--shadow-pop)] lg:bottom-6 lg:right-6"
        aria-expanded={open}
        aria-controls="guide-panel"
      >
        <Bot aria-hidden className="h-5 w-5" /> <span className="hidden sm:inline">Antariksha Guide</span>
      </button>
      {open ? (
        <aside
          id="guide-panel"
          aria-label="Antariksha Guide"
          className="no-print fixed bottom-36 right-3 z-40 flex max-h-[70vh] w-[min(94vw,24rem)] flex-col rounded-[var(--radius-card)] border border-line bg-surface shadow-2xl sm:right-5 lg:bottom-20"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="font-semibold">Antariksha Guide</p>
              <p className="text-xs text-muted">Ask about your data or where to find things.</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-surface-2" aria-label="Close guide">
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm" aria-live="polite">
            {log.length === 0 ? (
              <div className="space-y-2">
                <p className="text-muted">Try asking:</p>
                {(SUGGESTIONS[role] ?? SUGGESTIONS.astronaut).map((s) => (
                  <button key={s} onClick={() => ask(s)} className="block w-full rounded-xl border border-line px-3 py-2 text-left hover:bg-surface-2">
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
            {log.map((m, i) => (
              <div key={i} className="space-y-2">
                <p className="ml-8 rounded-xl bg-primary-soft px-3 py-2 text-fg">{m.q}</p>
                {"error" in m.a ? (
                  <p className="rounded-xl bg-danger-soft px-3 py-2 text-danger">{m.a.error}</p>
                ) : (
                  <div className={`mr-4 space-y-2 rounded-xl border px-3 py-2 ${m.a.kind === "emergency" ? "border-danger/40 bg-danger-soft" : "border-line bg-surface-2"}`}>
                    <p className="whitespace-pre-line">{m.a.text}</p>
                    {m.a.links.length ? (
                      <ul className="flex flex-wrap gap-2">
                        {m.a.links.map((l) => (
                          <li key={l.href}>
                            <Link href={l.href} className="text-primary underline-offset-2 hover:underline" onClick={() => setOpen(false)}>
                              {l.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {m.a.sources.length ? (
                      <div className="border-t border-line pt-1 text-xs text-muted">
                        Sources: {m.a.sources.map((s) => s.label).join("; ")}
                      </div>
                    ) : null}
                    <p className="text-[10px] uppercase tracking-wide text-muted">{m.a.engine === "local" || !m.a.engine ? "Local deterministic guide" : `AI provider: ${m.a.engine}`}</p>
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form
            className="flex gap-2 border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(q);
            }}
          >
            <label htmlFor="guide-q" className="sr-only">
              Ask the guide
            </label>
            <input id="guide-q" value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} placeholder="Ask a question…" className="h-10 flex-1 rounded-xl border border-line bg-surface px-3 text-sm" />
            <button type="submit" disabled={busy} className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-fg disabled:opacity-50" aria-label="Send">
              <Send aria-hidden className="h-4 w-4" />
            </button>
          </form>
        </aside>
      ) : null}
    </>
  );
}
