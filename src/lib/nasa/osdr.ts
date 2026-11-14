import "server-only";
import fixture from "./fixture-studies.json";

/**
 * Server-side client for the NASA Open Science Data Repository (OSDR) public API.
 * - Only documented endpoints are used; responses are parsed defensively (fields vary by study).
 * - Results are cached in-process for 1 hour and requests time out after 12 s.
 * - On failure, a clearly-labelled local fixture (real OSDR metadata captured earlier) is used.
 * OSDR is research data — NOT a live feed of astronaut health and not for individual diagnosis.
 */
const BASE = "https://osdr.nasa.gov";
const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: unknown }>();

export interface Provenance {
  source: string;
  url: string;
  retrievedAt: string;
  access: "public" | "restricted" | "simulated" | "fixture";
  note?: string;
}

export interface StudySummary {
  accession: string;
  title: string;
  organism: string;
  projectType: string;
  assayType: string;
  measurementType: string;
  materialType: string;
  mission: string;
  flightProgram: string;
  releaseDate: string | null;
  description: string;
}

export class OsdrError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function getJson<T>(url: string): Promise<{ data: T; retrievedAt: string; cached: boolean }> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return { data: hit.data as T, retrievedAt: new Date(hit.at).toISOString(), cached: true };
  const res = await fetch(url, { headers: { accept: "application/json", "user-agent": "Antariksha research explorer" }, signal: AbortSignal.timeout(12_000), cache: "no-store" });
  if (res.status === 429) throw new OsdrError("NASA OSDR rate limit reached. Please try again in a minute.", 429);
  if (!res.ok) throw new OsdrError(`NASA OSDR responded with ${res.status}.`, res.status);
  const data = (await res.json()) as T;
  cache.set(url, { at: Date.now(), data });
  if (cache.size > 300) cache.delete(cache.keys().next().value!);
  return { data, retrievedAt: new Date().toISOString(), cached: false };
}

const str = (v: unknown): string => (typeof v === "string" ? v : Array.isArray(v) ? v.filter((x) => typeof x === "string").join(", ") : "");

function toSummary(src: Record<string, unknown>): StudySummary {
  const mission = src["Mission"] as { Name?: unknown } | undefined;
  const rel = src["Study Public Release Date"];
  return {
    accession: str(src["Accession"]),
    title: str(src["Study Title"]) || "Untitled study",
    organism: str(src["organism"]) || "Not specified",
    projectType: str(src["Project Type"]),
    assayType: str(src["Study Assay Technology Type"]),
    measurementType: str(src["Study Assay Measurement Type"]),
    materialType: str(src["Material Type"]),
    mission: mission && typeof mission === "object" ? str(mission.Name) : "",
    flightProgram: str(src["Flight Program"]),
    releaseDate: typeof rel === "number" ? new Date(rel * 1000).toISOString() : null,
    description: str(src["Study Description"]).slice(0, 700),
  };
}

export const FILTER_FIELDS = {
  organism: "organism",
  projectType: "Project Type",
  assay: "Study Assay Technology Type",
  measurement: "Study Assay Measurement Type",
} as const;

export interface SearchParams {
  term: string;
  page: number;
  size: number;
  filterField?: keyof typeof FILTER_FIELDS;
  filterValue?: string;
}

export async function searchStudies(p: SearchParams): Promise<{ studies: StudySummary[]; total: number; provenance: Provenance; error?: string }> {
  const q = new URLSearchParams({ term: p.term || "space", from: String((p.page - 1) * p.size), size: String(p.size), type: "cgene" });
  if (p.filterField && p.filterValue) {
    q.set("ffield", FILTER_FIELDS[p.filterField]);
    q.set("fvalue", p.filterValue);
  }
  const url = `${BASE}/osdr/data/search?${q}`;
  try {
    const { data, retrievedAt, cached } = await getJson<{ hits?: { total?: number | { value?: number }; hits?: { _source?: Record<string, unknown> }[] } }>(url);
    const hits = data.hits?.hits ?? [];
    const totalRaw = data.hits?.total;
    const total = typeof totalRaw === "number" ? totalRaw : totalRaw?.value ?? hits.length;
    return {
      studies: hits.map((h) => toSummary(h._source ?? {})).filter((s) => s.accession),
      total,
      provenance: { source: "NASA OSDR search API", url, retrievedAt, access: "public", note: cached ? "Served from 1-hour server cache" : undefined },
    };
  } catch (e) {
    const msg = e instanceof OsdrError ? e.message : "NASA OSDR could not be reached.";
    const term = p.term.toLowerCase();
    const studies = fixture.studies.map((f) => ({ ...f, releaseDate: typeof f.releaseDate === "number" ? new Date(f.releaseDate * 1000).toISOString() : null })).filter((s) => !term || `${s.title} ${s.organism} ${s.description}`.toLowerCase().includes(term) || term === "space");
    return {
      studies,
      total: studies.length,
      provenance: { source: "Local fixture of real OSDR metadata (offline fallback)", url: fixture.sourceUrl, retrievedAt: fixture.retrievedAt, access: "fixture", note: "Live API unavailable — showing a small cached sample." },
      error: msg,
    };
  }
}

export interface StudyDetail {
  accession: string;
  title: string;
  description: string;
  organisms: string[];
  factors: string[];
  assays: { measurement: string; technology: string; platform: string }[];
  publicReleaseDate: string;
  submissionDate: string;
  comments: Record<string, string>;
  publications: { title: string; doi: string }[];
  provenance: Provenance;
}

type Annot = { annotationValue?: unknown } | undefined;

export async function getStudy(accession: string): Promise<StudyDetail> {
  const id = accession.replace(/^OSD-/i, "");
  if (!/^\d{1,6}$/.test(id)) throw new OsdrError("Invalid study accession.", 400);
  const url = `${BASE}/osdr/data/osd/meta/${id}`;
  const { data, retrievedAt } = await getJson<{ study?: Record<string, { studies?: Record<string, unknown>[] }> }>(url);
  const root = data.study?.[`OSD-${id}`];
  const s = root?.studies?.[0];
  if (!s) throw new OsdrError("Study not found in NASA OSDR.", 404);
  const factors = ((s.factors as { factorName?: unknown }[]) ?? []).map((f) => str(f.factorName)).filter(Boolean);
  const assays = ((s.assays as { measurementType?: Annot; technologyType?: Annot; technologyPlatform?: unknown }[]) ?? []).map((a) => ({
    measurement: str(a.measurementType?.annotationValue),
    technology: str(a.technologyType?.annotationValue),
    platform: str(a.technologyPlatform),
  }));
  const comments: Record<string, string> = {};
  for (const c of (s.comments as { name?: unknown; value?: unknown }[]) ?? []) {
    const n = str(c.name);
    const v = str(c.value);
    if (n && v) comments[n] = v;
  }
  const organisms = new Set<string>();
  const sources = ((s.materials as { sources?: { characteristics?: { category?: { characteristicType?: Annot }; value?: Annot | string }[] }[] })?.sources ?? []);
  for (const src of sources) {
    for (const ch of src.characteristics ?? []) {
      const cat = str(ch.category?.characteristicType?.annotationValue).toLowerCase();
      if (cat === "organism") organisms.add(typeof ch.value === "string" ? ch.value : str((ch.value as Annot)?.annotationValue));
    }
  }
  const pubs = ((s.publications as { title?: unknown; doi?: unknown }[]) ?? []).map((p) => ({ title: str(p.title), doi: str(p.doi) })).filter((p) => p.title);
  return {
    accession: `OSD-${id}`,
    title: str(s.title),
    description: str(s.description),
    organisms: [...organisms].filter(Boolean),
    factors,
    assays,
    publicReleaseDate: str(s.publicReleaseDate),
    submissionDate: str(s.submissionDate),
    comments,
    publications: pubs,
    provenance: { source: "NASA OSDR study metadata API", url, retrievedAt, access: "public" },
  };
}

export interface StudyFile {
  name: string;
  category: string;
  subcategory: string;
  sizeBytes: number;
  restricted: boolean;
  url: string;
}

export async function getStudyFiles(accession: string): Promise<{ files: StudyFile[]; provenance: Provenance }> {
  const id = accession.replace(/^OSD-/i, "");
  if (!/^\d{1,6}$/.test(id)) throw new OsdrError("Invalid study accession.", 400);
  const url = `${BASE}/osdr/data/osd/files/${id}?page=0&size=100`;
  const { data, retrievedAt } = await getJson<{ studies?: Record<string, { study_files?: Record<string, unknown>[] }> }>(url);
  const files = (data.studies?.[`OSD-${id}`]?.study_files ?? []).map((f) => {
    const remote = str(f.remote_url);
    return {
      name: str(f.file_name),
      category: str(f.category),
      subcategory: str(f.subcategory),
      sizeBytes: typeof f.file_size === "number" ? f.file_size : 0,
      restricted: f.restricted === true,
      // Only build links to the official OSDR host; never proxy or auto-download large files.
      url: remote.startsWith("/") ? `${BASE}${remote}` : `${BASE}/bio/repo/data/studies/OSD-${id}`,
    };
  });
  return { files, provenance: { source: "NASA OSDR study files API", url, retrievedAt, access: "public", note: "Restricted (controlled-access) files are listed but never requested." } };
}

export async function listGeode(kind: "missions" | "experiments" | "payloads" | "hardware" | "vehicles" | "subjects" | "biospecimens", limit = 24) {
  const url = `${BASE}/geode-py/ws/api/${kind}`;
  try {
    const { data, retrievedAt } = await getJson<{ data?: Record<string, unknown>[] }>(url);
    const items = (data.data ?? []).map((d) => {
      const link = Object.values(d).find((v) => typeof v === "string") as string | undefined;
      return { id: link ? decodeURIComponent(link.split("/").pop() ?? "") : "", url: link ?? "" };
    });
    return { items: items.slice(0, limit), total: items.length, provenance: { source: `NASA OSDR GEODE ${kind} API`, url, retrievedAt, access: "public" as const } };
  } catch (e) {
    return { items: [], total: 0, provenance: { source: `NASA OSDR GEODE ${kind} API`, url, retrievedAt: new Date().toISOString(), access: "public" as const }, error: e instanceof Error ? e.message : "Unavailable" };
  }
}

export function formatBytes(n: number) {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}
