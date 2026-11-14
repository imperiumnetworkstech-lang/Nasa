import "server-only";
import type { App } from "firebase-admin/app";

/**
 * Firebase Admin SDK — server-only. The SDK is loaded lazily (dynamic import) and only when
 * Firebase credentials are configured, so local/demo deployments never load it at all.
 */
export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

/**
 * Accepts the service-account key in any of the forms people paste it in: with literal "\n"
 * sequences, with real line breaks, wrapped in quotes, or with all line breaks lost (one long
 * line). Always returns a valid PEM.
 */
export function normalizePrivateKey(raw: string): string {
  let k = raw.trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) k = k.slice(1, -1);
  k = k.replace(/\\n/g, "\n").replace(/\r/g, "");
  const m = k.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
  if (!m) return k;
  const body = m[2].replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${m[1]}-----\n${lines.join("\n")}\n-----END ${m[1]}-----\n`;
}

let app: App | null = null;

export async function getAdminApp(): Promise<App> {
  if (app) return app;
  if (!isAdminConfigured()) {
    throw new Error("Firebase Admin is not configured. See README → Firebase setup.");
  }
  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY!),
      }),
    });
  return app;
}

export async function adminAuth() {
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth(await getAdminApp());
}

export async function adminDb() {
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore(await getAdminApp());
}
