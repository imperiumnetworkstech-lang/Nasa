import { LogoMark } from "@/components/brand";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main id="main" className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-4 rounded-[var(--radius-card)] bg-surface p-8 text-center shadow-[var(--shadow-card)]">
        <LogoMark className="mx-auto" />
        <h1 className="text-xl font-bold">You&apos;re offline</h1>
        <p className="text-sm text-muted">This page needs a connection. Non-emergency entries you already made are kept on this device as “Queued — not sent” and will send when you reconnect.</p>
        <p className="rounded-2xl bg-danger-soft p-3 text-sm text-danger">Emergencies: follow your mission&apos;s approved emergency procedure now. Nothing has been sent from this screen.</p>
      </div>
    </main>
  );
}
