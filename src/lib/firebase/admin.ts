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
        // Env vars usually store the key with literal "\n" sequences.
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
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
