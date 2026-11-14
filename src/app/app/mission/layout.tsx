import { requireSection } from "@/lib/auth/current-user";

export default async function MissionLayout({ children }: LayoutProps<"/app/mission">) {
  await requireSection("mission");
  return children;
}
