import { requireSection } from "@/lib/auth/current-user";

export default async function ResearchLayout({ children }: LayoutProps<"/app/research">) {
  await requireSection("research");
  return children;
}
