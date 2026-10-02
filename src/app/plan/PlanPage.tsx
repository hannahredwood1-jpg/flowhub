"use client";
import { useState } from "react";
import { api } from "@/lib/api-client";
import type { CatalogFirm, DashboardData } from "@/lib/types";
import { ProjectionsPage } from "@/components/Projections";

export function PlanPage({ initial, catalog }: { initial: DashboardData; catalog: CatalogFirm[] }) {
  const [data, setData] = useState(initial);
  return <ProjectionsPage data={data} catalog={catalog} onSaved={async () => setData(await api.dashboard())} />;
}
