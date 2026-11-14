import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

/** Clears the session cookie and returns to the login page (also used to recover stale sessions). */
function logout(req: Request, status: 303 | 307) {
  const res = NextResponse.redirect(new URL("/login", req.url), status);
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET(req: Request) {
  return logout(req, 307);
}

export async function POST(req: Request) {
  // 303 so the browser follows with GET.
  return logout(req, 303);
}
