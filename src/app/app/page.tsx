import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { HOME_FOR_ROLE } from "@/lib/permissions";
import { Callout, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

/** Role-aware redirect. If a user was bounced from a section they cannot access, explain why. */
export default async function AppHome({ searchParams }: PageProps<"/app">) {
  const user = await requireUser();
  const sp = await searchParams;
  if (!sp.denied) redirect(HOME_FOR_ROLE[user.role]);
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Access restricted" />
      <Callout tone="warn" title="This area is not available for your role">
        Your account&apos;s role does not grant access to the “{String(sp.denied)}” section. Permissions are enforced on the server; ask a platform administrator if you believe this is wrong.
      </Callout>
      <div className="mt-4">
        <ButtonLink href={HOME_FOR_ROLE[user.role]}>Go to my dashboard</ButtonLink>
      </div>
    </div>
  );
}
