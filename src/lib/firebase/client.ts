"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { firebaseWebConfig, isFirebaseClientConfigured } from "./config";

let appCheckStarted = false;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseClientConfigured()) return null;
  const app = getApps().length ? getApp() : initializeApp(firebaseWebConfig);
  // App Check (optional): enabled when a reCAPTCHA v3 / Enterprise site key is supplied.
  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (siteKey && !appCheckStarted && typeof window !== "undefined") {
    appCheckStarted = true;
    void import("firebase/app-check").then(({ initializeAppCheck, ReCaptchaV3Provider }) =>
      initializeAppCheck(app, { provider: new ReCaptchaV3Provider(siteKey), isTokenAutoRefreshEnabled: true }),
    );
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}
