/** Deterministic alert id from a dedupe key so re-running rules never duplicates alerts. */
export function alertIdFor(dedupeKey: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < dedupeKey.length; i++) {
    const c = dedupeKey.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822507);
  }
  return `al_${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
}
