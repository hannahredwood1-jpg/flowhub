import { requireStaffPage, audit } from "@/lib/rbac";
import { loadDirectory, person } from "@/lib/dashboard";
import { sortDirectory } from "@/lib/viewmodel";
import { todayET } from "@/lib/types";
import { AppShell } from "@/components/AppShell";
import { CoachPortal } from "@/components/CoachPortal";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const staff = await requireStaffPage(); // Admin or Trading Coach role in our Discord server, re-checked every 10 min
  await audit(staff.id, "VIEW_DIRECTORY");
  const rows = sortDirectory(await loadDirectory(staff), "drawdown");
  return (
    <AppShell viewer={person(staff)} active="coach">
      <CoachPortal initial={rows} today={todayET()} />
    </AppShell>
  );
}
