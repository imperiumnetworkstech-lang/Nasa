import { requireSection } from "@/lib/auth/current-user";

export default async function MedicalLayout({ children }: LayoutProps<"/app/medical">) {
  await requireSection("medical");
  return children;
}
