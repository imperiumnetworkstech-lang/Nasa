"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { loginSchema, registerSchema } from "@/lib/validation/schemas";
import type { z } from "zod";

type LoginValues = z.input<typeof loginSchema>;
type RegisterValues = z.input<typeof registerSchema>;

async function exchange(idToken: string, extra: Record<string, string | undefined> = {}) {
  const res = await fetch("/api/auth/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken, ...extra }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Sign-in failed");
  return json.redirect as string;
}

function friendlyFirebaseError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Email or password is incorrect.";
  if (code.includes("email-already-in-use")) return "An account with this email already exists.";
  if (code.includes("too-many-requests")) return "Too many attempts. Please wait and try again.";
  if (code.includes("popup-closed")) return "Sign-in window was closed.";
  if (code.includes("weak-password")) return "Choose a stronger password.";
  return e instanceof Error ? e.message : "Something went wrong.";
}

export function LoginForm({ firebase, next }: { firebase: boolean; next?: string }) {
  const [state, setState] = useState<{ ok?: boolean; message?: string } | null>(null);
  const { register, handleSubmit, formState } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const go = (redirect: string) => window.location.assign(next && next.startsWith("/app") ? next : redirect);

  const onSubmit = handleSubmit(async (v) => {
    setState(null);
    try {
      if (firebase) {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Firebase is not configured.");
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        const cred = await signInWithEmailAndPassword(auth, v.email, v.password);
        go(await exchange(await cred.user.getIdToken()));
      } else {
        const res = await fetch("/api/auth/local", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "login", ...v }) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        go(json.redirect);
      }
    } catch (e) {
      setState({ ok: false, message: friendlyFirebaseError(e) });
    }
  });

  async function google() {
    setState(null);
    try {
      const auth = getFirebaseAuth();
      if (!auth) return;
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      go(await exchange(await cred.user.getIdToken()));
    } catch (e) {
      setState({ ok: false, message: friendlyFirebaseError(e) });
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!formState.errors.email} {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={formState.errors.password?.message}>
        <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!formState.errors.password} {...register("password")} />
      </Field>
      <div className="flex justify-end text-sm">
        <Link href="/forgot-password" className="text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
      <FormMessage state={state} />
      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
      {firebase ? (
        <Button variant="outline" className="w-full" onClick={google}>
          Continue with Google
        </Button>
      ) : null}
    </form>
  );
}

export function RegisterForm({ firebase }: { firebase: boolean }) {
  const [state, setState] = useState<{ ok?: boolean; message?: string } | null>(null);
  const { register, handleSubmit, formState } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (v) => {
    setState(null);
    try {
      if (firebase) {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Firebase is not configured.");
        const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
        const cred = await createUserWithEmailAndPassword(auth, v.email, v.password);
        await updateProfile(cred.user, { displayName: v.displayName });
        window.location.assign(await exchange(await cred.user.getIdToken(), { displayName: v.displayName, inviteCode: v.inviteCode || undefined }));
      } else {
        const res = await fetch("/api/auth/local", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "register", ...v }) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        window.location.assign(json.redirect);
      }
    } catch (e) {
      setState({ ok: false, message: friendlyFirebaseError(e) });
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Display name" htmlFor="displayName" error={formState.errors.displayName?.message} help="Shown to your care team and crew.">
        <Input id="displayName" autoComplete="name" aria-invalid={!!formState.errors.displayName} {...register("displayName")} />
      </Field>
      <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!formState.errors.email} {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={formState.errors.password?.message} help="At least 10 characters.">
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!formState.errors.password} {...register("password")} />
      </Field>
      <Field
        label="Invitation code"
        optional
        htmlFor="inviteCode"
        error={formState.errors.inviteCode?.message}
        help="From your mission administrator. Without a code you join as a crew member with no mission assigned. (Demo: DEMO-CREW)"
      >
        <Input id="inviteCode" autoCapitalize="characters" {...register("inviteCode")} />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-xs text-muted">Roles are assigned by administrators or invitation codes — you cannot choose a privileged role yourself.</p>
    </form>
  );
}

export function ForgotForm({ firebase }: { firebase: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ ok?: boolean; message?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!firebase) {
    return (
      <FormMessage
        state={{
          ok: false,
          message: "Password reset emails need Firebase Authentication, which is not configured on this local deployment. Ask an administrator to reset your account, or configure Firebase (see README).",
        }}
      />
    );
  }
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const auth = getFirebaseAuth();
          const { sendPasswordResetEmail } = await import("firebase/auth");
          if (auth) await sendPasswordResetEmail(auth, email);
        } catch {
          /* do not reveal whether the account exists */
        }
        setBusy(false);
        setState({ ok: true, message: "If an account exists for that email, a reset link has been sent." });
      }}
    >
      <Field label="Email" htmlFor="email">
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
