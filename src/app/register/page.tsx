import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/auth-form";
import { Callout } from "@/components/ui/misc";
import { isFirebaseClientConfigured } from "@/lib/firebase/config";
import { isAdminConfigured } from "@/lib/firebase/admin";

// Reads runtime configuration (demo mode, Firebase) on each request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  const firebase = isFirebaseClientConfigured() && isAdminConfigured();
  return (
    <AuthCard
      title="Create your account"
      subtitle={
        <>
          Already registered?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
      aside={
        <>
          <Callout tone="info" title="How roles work">
            New accounts start as crew members. Medical, commander, researcher and administrator roles are granted only by an administrator or a server-validated invitation code.
          </Callout>
          <Callout tone="warn" title="Research & simulation software">
            Antariksha is not a medical device and not an emergency service. Do not enter real patient data into a demo deployment.
          </Callout>
        </>
      }
    >
      <RegisterForm firebase={firebase} />
    </AuthCard>
  );
}
