import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Minimal browser globals for the client-side offline queue.
function installBrowser(online: boolean) {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  const target = new EventTarget();
  vi.stubGlobal("window", target);
  vi.stubGlobal("navigator", { onLine: online });
}

describe("offline queue", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it("queues a non-emergency check-in offline and marks it as not sent", async () => {
    installBrowser(false);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const q = await import("@/lib/offline/queue");
    const r = await q.submitRecord("checkIns", { overall: 4, fatigue: 2, stress: 2, pain: 1, wantsFollowUp: false });
    expect(r.status).toBe("queued");
    expect(q.getQueue()).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled(); // nothing was claimed as delivered
  });

  it("never queues symptom reports and says plainly they were NOT sent", async () => {
    installBrowser(false);
    const q = await import("@/lib/offline/queue");
    const r = await q.submitRecord("symptomReports", { bodyArea: "Head" });
    expect(r.status).toBe("error");
    expect(r.status === "error" && r.error).toMatch(/NOT been sent/);
    expect(q.getQueue()).toHaveLength(0);
  });

  it("keeps rejected items queued with the server's error and drops synced ones", async () => {
    installBrowser(false);
    const q = await import("@/lib/offline/queue");
    const a = q.enqueue("checkIns", {});
    const b = q.enqueue("hydrationLogs", { amountMl: 250 });
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ results: [{ clientId: a.clientId, status: "rejected", error: "Invalid" }, { clientId: b.clientId, status: "synced" }], syncedAt: new Date().toISOString() }))),
    );
    const res = await q.flushQueue();
    expect(res).toEqual({ synced: 1, failed: 1 });
    const left = q.getQueue();
    expect(left).toHaveLength(1);
    expect(left[0].error).toBe("Invalid");
  });
});

describe("NASA OSDR client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("a failed NASA request falls back to a labelled fixture instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    const { searchStudies } = await import("@/lib/nasa/osdr");
    const r = await searchStudies({ term: "zzz-unlikely-term-" + Math.random(), page: 1, size: 10 });
    expect(r.error).toBeTruthy();
    expect(r.provenance.access).toBe("fixture");
    expect(Array.isArray(r.studies)).toBe(true);
  });

  it("parses live-shaped responses defensively", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ hits: { total: 1, hits: [{ _source: { Accession: "OSD-1", "Study Title": "T", organism: "Mus musculus", Mission: { Name: "STS-1" }, "Study Public Release Date": 1700000000 } }] } }))),
    );
    const { searchStudies } = await import("@/lib/nasa/osdr");
    const r = await searchStudies({ term: "unique-" + Math.random(), page: 1, size: 10 });
    expect(r.studies[0]).toMatchObject({ accession: "OSD-1", organism: "Mus musculus", mission: "STS-1" });
    expect(r.provenance.access).toBe("public");
  });

  it("surfaces rate limiting as a friendly error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 429 })));
    const { searchStudies } = await import("@/lib/nasa/osdr");
    const r = await searchStudies({ term: "rl-" + Math.random(), page: 1, size: 10 });
    expect(r.error).toMatch(/rate limit/i);
  });
});
