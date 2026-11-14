import { requireSection } from "@/lib/auth/current-user";
import { StaffCaseWatcher } from "@/components/cases/staff-watcher";

export default async function MissionLayout({ children }: LayoutProps<"/app/mission">) {
  await requireSection("mission");
  return (
    <>
      {children}
      <StaffCaseWatcher />
    </>
  );
}
