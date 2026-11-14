"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Send } from "lucide-react";
import { askDoctor } from "@/lib/actions/features";
import { Button } from "@/components/ui/button";
import { FormMessage, Textarea } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const TOPICS = [
  ["symptom", "🤒 How I feel"],
  ["sleep", "🌙 Sleep"],
  ["exercise", "🏋️ Exercise"],
  ["food", "🍽️ Food"],
  ["medication", "💊 Medicine"],
  ["mood", "🙂 Mood"],
  ["other", "💬 Other"],
] as const;

/** Compose a question; crew choose exactly which of their own summaries to attach. */
export function AskForm({ previews, timing }: { previews: { key: string; label: string; summary: string }[]; timing: string }) {
  const [text, setText] = useState("");
  const [topic, setTopic] = useState<string>("symptom");
  const [priority, setPriority] = useState<"routine" | "soon">("routine");
  const [attach, setAttach] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        if (!navigator.onLine) {
          setErr("You are offline. This question has NOT been sent. If it's urgent, use your mission's emergency procedure.");
          return;
        }
        start(async () => {
          try {
            const r = await askDoctor({ text, topic, priority, attach });
            if (!r.ok) return setErr(r.message);
            toast({ tone: "success", title: "Question sent 🚀", body: "Watch its journey below." });
            setText("");
            setAttach([]);
            router.refresh();
          } catch {
            setErr("Not sent — the connection failed. Please try again.");
          }
        });
      }}
    >
      <div role="radiogroup" aria-label="Topic" className="flex flex-wrap gap-2">
        {TOPICS.map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={topic === k} onClick={() => setTopic(k)} className={cn("rounded-full px-3 py-1.5 text-sm transition-all active:scale-95", topic === k ? "hero-gradient font-semibold text-white" : "bg-surface-2 hover:bg-primary-soft")}>
            {l}
          </button>
        ))}
      </div>
      <label htmlFor="ask-text" className="sr-only">
        Your question
      </label>
      <Textarea id="ask-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} placeholder="What would you like to ask your doctor?" className="min-h-28" />
      <fieldset>
        <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <Paperclip aria-hidden className="h-4 w-4" /> Add my data (optional — only what you tick is sent)
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {previews.map((p) => {
            const on = attach.includes(p.key);
            return (
              <button
                type="button"
                key={p.key}
                aria-pressed={on}
                onClick={() => setAttach(on ? attach.filter((x) => x !== p.key) : [...attach, p.key])}
                className={cn("rounded-2xl border px-3 py-2 text-left text-sm transition-all active:scale-[0.98]", on ? "border-primary bg-primary-soft" : "border-line bg-surface hover:bg-surface-2")}
              >
                <span className="block font-medium">
                  {on ? "✓ " : ""}
                  {p.label}
                </span>
                <span className="block text-xs text-muted">{p.summary}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <div role="radiogroup" aria-label="How soon" className="inline-flex rounded-full bg-surface-2 p-1">
          {(["routine", "soon"] as const).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={priority === p} onClick={() => setPriority(p)} className={cn("rounded-full px-4 py-1.5 text-sm", priority === p ? "bg-surface font-semibold text-primary shadow-sm" : "text-muted")}>
              {p === "routine" ? "When you can" : "Soon please"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{timing}</p>
      </div>
      <FormMessage state={err ? { ok: false, message: err } : null} />
      <Button type="submit" size="lg" loading={pending} disabled={text.trim().length < 5}>
        {pending ? null : <Send aria-hidden className="h-4 w-4" />} Send to my doctor
      </Button>
    </form>
  );
}
