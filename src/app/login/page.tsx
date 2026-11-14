import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/auth-form";
import { DemoEntry } from "@/components/auth/demo-entry";
import { Callout } from "@/components/ui/misc";
import { isDemoEnabled } from "@/lib/config";
import { isFirebaseClientConfigured } from "@/lib/firebase/config";
import { isAdminConfigured } from "@/lib/firebase/admin";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const firebase = isFirebaseClientConfigured() && isAdminConfigured();
  const demo = isDemoEnabled();
  return (
    <AuthCard
      title="Sign in to Antariksha"
      subtitle={
        <>
          New here?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
      aside={
        <>
          {demo ? (
            <div className="rounded-3xl border border-line bg-surface p-6">
              <h2 className="mb-3 font-semibold">Or enter the demo</h2>
              <DemoEntry compact />
            </div>
          ) : null}
          {!firebase ? (
            <Callout tone="info" title="Local mode">
              Firebase is not configured, so accounts are stored in the local development data file. Configure Firebase for production (see README).
            </Callout>
          ) : null}
        </>
      }
    >
      <LoginForm firebase={firebase} next={typeof sp.next === "string" ? sp.next : undefined} />
    </AuthCard>
  );
}
