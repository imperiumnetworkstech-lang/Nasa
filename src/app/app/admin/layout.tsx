import { requireSection } from "@/lib/auth/current-user";

export default async function AdminLayout({ children }: LayoutProps<"/app/admin">) {
  await requireSection("admin");
  return children;
}
