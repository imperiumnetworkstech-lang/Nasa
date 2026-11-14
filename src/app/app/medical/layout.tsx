import { requireSection } from "@/lib/auth/current-user";
import { StaffCaseWatcher } from "@/components/cases/staff-watcher";

export default async function MedicalLayout({ children }: LayoutProps<"/app/medical">) {
  await requireSection("medical");
  return (
    <>
      {children}
      <StaffCaseWatcher />
    </>
  );
}
