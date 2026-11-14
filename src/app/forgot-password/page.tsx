import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotForm } from "@/components/auth/auth-form";
import { isFirebaseClientConfigured } from "@/lib/firebase/config";
import { isAdminConfigured } from "@/lib/firebase/admin";

// Reads runtime configuration (demo mode, Firebase) on each request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  const firebase = isFirebaseClientConfigured() && isAdminConfigured();
  return (
    <AuthCard
      title="Reset your password"
      subtitle={
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotForm firebase={firebase} />
    </AuthCard>
  );
}
