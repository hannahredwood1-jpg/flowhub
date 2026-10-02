import { requireUserPage } from "@/lib/rbac";
import { loadCatalog, loadDashboard } from "@/lib/dashboard";
import { AppShell } from "@/components/AppShell";
import { PlanPage } from "./PlanPage";

export const dynamic = "force-dynamic";

export default async function Plan() {
  const user = await requireUserPage();
  const [data, catalog] = await Promise.all([loadDashboard(user, user.id), loadCatalog()]);
  return (
    <AppShell viewer={data.viewer} active="plan">
      <PlanPage initial={data} catalog={catalog} />
    </AppShell>
  );
}
