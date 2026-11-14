import { SignJWT, jwtVerify } from "jose";

/**
 * Signed, httpOnly session cookie (HS256). Holds only the uid and how the user signed in.
 * The role is NEVER read from the cookie — it is loaded from the database on every request.
 */
export const SESSION_COOKIE = "ak_session";
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 5;

export interface SessionPayload {
  uid: string;
  mode: "firebase" | "local" | "demo";
}

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET (≥32 chars) must be set in production.");
    }
    return new TextEncoder().encode("antariksha-dev-only-session-secret-change-me-0123456789");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT({ mode: p.mode })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.uid)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_S}s`)
    .setIssuer("antariksha")
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: "antariksha", algorithms: ["HS256"] });
    if (!payload.sub) return null;
    const mode = payload.mode;
    if (mode !== "firebase" && mode !== "local" && mode !== "demo") return null;
    return { uid: payload.sub, mode };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_S,
};
