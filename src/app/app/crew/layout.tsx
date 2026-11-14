import { requireSection } from "@/lib/auth/current-user";

export default async function CrewLayout({ children }: LayoutProps<"/app/crew">) {
  await requireSection("crew");
  return children;
}
