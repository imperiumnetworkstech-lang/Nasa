import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { clientKey, rateLimit } from "@/lib/auth/rate-limit";
import { localGuide } from "@/lib/guide/local";
import { getProvider } from "@/lib/guide/provider";
import { getSettings } from "@/lib/data/repo";
import { ARTICLES } from "@/lib/content/library";

const body = z.object({ question: z.string().trim().min(1).max(500) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const rl = rateLimit(clientKey(req, `guide:${user.uid}`), 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many questions — please wait a moment." }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ask a question (max 500 characters)." }, { status: 400 });

  const local = await localGuide(user, parsed.data.question);
  // Safety-critical and record-based answers are always deterministic and local.
  if (local.kind !== "fallback" && local.kind !== "library") return NextResponse.json({ ...local, engine: "local" });

  const settings = await getSettings();
  const provider = settings.features.guideAI ? getProvider() : null;
  if (!provider) return NextResponse.json({ ...local, engine: "local" });
  try {
    const context = ARTICLES.filter((a) => a.approval !== "draft")
      .map((a) => `# ${a.title} (v${a.version}, ${a.approval})\n${a.body.join(" ")}`)
      .join("\n\n");
    const text = await provider.complete({ question: parsed.data.question, context });
    return NextResponse.json({
      kind: "library",
      text: `${text}\n\n(AI-generated from approved library content — review before relying on it.)`,
      links: local.links,
      sources: ARTICLES.map((a) => ({ label: `${a.title} v${a.version}`, at: a.reviewDate })),
      engine: provider.name,
    });
  } catch {
    return NextResponse.json({ ...local, engine: "local" });
  }
}
