import "server-only";

/** Astronomy Picture of the Day — an educational card only, never health data. Key stays server-side. */
export interface Apod {
  title: string;
  date: string;
  explanation: string;
  url: string;
  mediaType: string;
  copyright?: string;
}

let cached: { at: number; data: Apod } | null = null;

export async function getApod(): Promise<Apod | null> {
  if (cached && Date.now() - cached.at < 6 * 3_600_000) return cached.data;
  const key = process.env.NASA_API_KEY || "DEMO_KEY"; // DEMO_KEY only for low-volume local testing
  try {
    const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(key)}&thumbs=true`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) return null;
    const j = (await res.json()) as Record<string, unknown>;
    const data: Apod = {
      title: String(j.title ?? ""),
      date: String(j.date ?? ""),
      explanation: String(j.explanation ?? "").slice(0, 400),
      url: String(j.media_type === "video" ? (j.thumbnail_url ?? "") : (j.url ?? "")),
      mediaType: String(j.media_type ?? "image"),
      copyright: j.copyright ? String(j.copyright).trim() : undefined,
    };
    cached = { at: Date.now(), data };
    return data;
  } catch {
    return null;
  }
}
