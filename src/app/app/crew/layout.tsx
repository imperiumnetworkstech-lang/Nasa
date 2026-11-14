import { requireSection } from "@/lib/auth/current-user";
import { CrewCaseWatcher } from "@/components/cases/live";

export default async function CrewLayout({ children }: LayoutProps<"/app/crew">) {
  await requireSection("crew");
  return (
    <>
      {children}
      <CrewCaseWatcher />
    </>
  );
}
