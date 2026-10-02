import { requireUserPage } from "@/lib/rbac";
import { loadCatalog, loadDashboard } from "@/lib/dashboard";
import { AppShell } from "@/components/AppShell";
import { MemberDashboard } from "@/components/MemberDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUserPage();
  const [data, catalog] = await Promise.all([loadDashboard(user, user.id), loadCatalog()]);
  return (
    <AppShell viewer={data.viewer} active="dashboard">
      <MemberDashboard initial={data} catalog={catalog} />
    </AppShell>
  );
}
