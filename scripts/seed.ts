/**
 * Seeds clearly-labelled SYNTHETIC demo data into the configured backend.
 *   npm run seed            → Firestore if Firebase Admin env vars are set, else the local file store
 *   npm run seed -- --reset → local store only: wipe and re-seed
 * Never run against a project that holds real health data.
 */
import { getStore } from "../src/lib/data";
import { getLocalStore } from "../src/lib/data/local-store";
import { seedDemoData } from "../src/lib/data/seed";
import { listMissions } from "../src/lib/data/repo";

async function main() {
  process.env.DEMO_MODE ??= "true";
  const reset = process.argv.includes("--reset");
  const local = getLocalStore();
  if (reset) await local.reset();
  const store = await getStore();
  if ((await listMissions()).some((m) => m.isDemo)) {
    console.log(`Demo data already present in ${store.backend} store. Use --reset (local) or Admin → Settings → Regenerate.`);
  } else {
    await seedDemoData(store, new Date());
    console.log(`Seeded synthetic demo data into ${store.backend} store.`);
  }
  if (store.backend === "local") local.flush();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
