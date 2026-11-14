import "server-only";

/**
 * Optional external AI provider for Antariksha Guide. DISABLED unless:
 *  1. AI_PROVIDER, AI_API_KEY and AI_MODEL are set server-side, AND
 *  2. an administrator enables "Guide AI" in Admin → Settings after reviewing privacy implications.
 * Privacy: only the user's question and approved, non-personal library text are sent. Health
 * records are NEVER sent to a third-party model; record-based answers always come from the local
 * deterministic responder.
 */
export interface GuideProvider {
  name: string;
  complete(input: { question: string; context: string }): Promise<string>;
}

export function isProviderConfigured() {
  return Boolean(process.env.AI_PROVIDER && process.env.AI_API_KEY && process.env.AI_MODEL);
}

const SYSTEM = `You are Antariksha Guide inside a crew wellbeing app for simulated space missions.
Rules: never diagnose, prescribe, give doses, or make fitness-for-duty decisions; never invent medical facts or NASA findings;
if anything sounds urgent tell the user to follow their mission's approved emergency procedure immediately.
Answer briefly using only the provided context. If the context does not contain the answer, say so.`;

export function getProvider(): GuideProvider | null {
  if (!isProviderConfigured()) return null;
  const provider = process.env.AI_PROVIDER!.toLowerCase();
  if (provider === "anthropic") {
    return {
      name: "anthropic",
      async complete({ question, context }) {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": process.env.AI_API_KEY!, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: process.env.AI_MODEL,
            max_tokens: 500,
            system: SYSTEM,
            messages: [{ role: "user", content: `Context (approved library excerpts):\n${context}\n\nQuestion: ${question}` }],
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`Provider error ${res.status}`);
        const json = (await res.json()) as { content?: { type: string; text?: string }[] };
        return json.content?.find((c) => c.type === "text")?.text ?? "";
      },
    };
  }
  if (provider === "openai-compatible") {
    return {
      name: "openai-compatible",
      async complete({ question, context }) {
        const res = await fetch(`${process.env.AI_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${process.env.AI_API_KEY}` },
          body: JSON.stringify({
            model: process.env.AI_MODEL,
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: `Context (approved library excerpts):\n${context}\n\nQuestion: ${question}` },
            ],
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`Provider error ${res.status}`);
        const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        return json.choices?.[0]?.message?.content ?? "";
      },
    };
  }
  return null;
}
