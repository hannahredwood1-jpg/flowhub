"use client";
import { useState } from "react";
import { api } from "@/lib/api-client";
import type { CatalogFirm, DashboardData } from "@/lib/types";
import { TradingPlanPage } from "@/components/TradingPlan";

export function PlanPage({ initial, catalog }: { initial: DashboardData; catalog: CatalogFirm[] }) {
  const [data, setData] = useState(initial);
  return <TradingPlanPage data={data} catalog={catalog} onSaved={async () => setData(await api.dashboard())} />;
}
