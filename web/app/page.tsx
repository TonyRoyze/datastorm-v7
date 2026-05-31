import fs from "fs";
import path from "path";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import {
  SectionCards,
  type CardData,
} from "@/components/section-cards";
import { PageContextSetter } from "@/components/page-context-setter";
import { JitInsights } from "@/components/jit-insights";

const DATA_DIR = path.join(process.cwd(), "public", "data");

import { cache } from "react";
import { fmtMoney, fmtNumber } from "@/lib/utils";
const fsPromises = fs.promises;

const readJSON = cache(async (filename: string): Promise<any[]> => {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) return [];
  const fileContent = await fsPromises.readFile(p, "utf-8");
  return JSON.parse(fileContent);
});

const isWesternProvince = (lat: number, lng: number) => {
  return lat >= 6.4 && lat <= 7.2 && lng >= 79.7 && lng <= 80.2;
};

export default async function OverviewPage() {
  const coords = await readJSON("outlet_coordinates.json");
  const preds = await readJSON("predictions.json");
  const budget = await readJSON("budget_allocations.json");

  const validCoords = coords.filter(
    (c: any) =>
      typeof c.Latitude === "number" && typeof c.Longitude === "number"
  );
  const wpCoords = validCoords.filter((c: any) =>
    isWesternProvince(c.Latitude, c.Longitude)
  );

  const totalVolume = preds.reduce(
    (s: number, p: any) => s + (p.Maximum_Monthly_Liters ?? 0),
    0
  );
  const avgVolume = preds.length ? totalVolume / preds.length : 0;
  const totalBudget = budget.reduce(
    (s: number, b: any) => s + (b.Trade_Spend_LKR ?? 0),
    0
  );
  const wpShare =
    validCoords.length > 0
      ? ((wpCoords.length / validCoords.length) * 100).toFixed(1)
      : "0";

  const sorted = [...budget].sort(
    (a: any, b: any) => b.Trade_Spend_LKR - a.Trade_Spend_LKR
  );

  const tableData = sorted.map((b: any) => ({
    Outlet_ID: b.Outlet_ID,
    Distributor_ID: b.Distributor_ID,
    Outlet_Type: b.Outlet_Type,
    Outlet_Size: b.Outlet_Size,
    Cooler_Count: b.Cooler_Count,
    constraint_flag: b.constraint_flag,
    volume_cv: b.volume_cv,
    historical_max_volume: b.historical_max_volume,
    Maximum_Monthly_Liters: b.Maximum_Monthly_Liters,
    incremental_volume: b.incremental_volume,
    Trade_Spend_LKR: b.Trade_Spend_LKR,
    Spend_Type: b.Spend_Type,
  }));

  // --- Build rich context for the chatbot ---

  // Sort by predicted volume (worst = lowest)
  const sortedByVolume = [...budget].sort(
    (a: any, b: any) => a.Maximum_Monthly_Liters - b.Maximum_Monthly_Liters
  );

  // Breakdown by outlet type
  const byType: Record<string, { count: number; totalSpend: number; totalVolume: number }> = {};
  budget.forEach((b: any) => {
    const t = b.Outlet_Type || "Unknown";
    if (!byType[t]) byType[t] = { count: 0, totalSpend: 0, totalVolume: 0 };
    byType[t].count++;
    byType[t].totalSpend += b.Trade_Spend_LKR ?? 0;
    byType[t].totalVolume += b.Maximum_Monthly_Liters ?? 0;
  });
  const outletTypeSummary = Object.entries(byType).map(([type, stats]) => ({
    type,
    count: stats.count,
    avgSpendLKR: Math.round(stats.totalSpend / stats.count),
    avgVolumeLmo: Math.round(stats.totalVolume / stats.count),
    totalSpendLKR: Math.round(stats.totalSpend),
  })).sort((a, b) => b.totalSpendLKR - a.totalSpendLKR);

  // Breakdown by distributor
  const byDist: Record<string, { count: number; totalSpend: number; totalVolume: number }> = {};
  budget.forEach((b: any) => {
    const d = b.Distributor_ID || "Unknown";
    if (!byDist[d]) byDist[d] = { count: 0, totalSpend: 0, totalVolume: 0 };
    byDist[d].count++;
    byDist[d].totalSpend += b.Trade_Spend_LKR ?? 0;
    byDist[d].totalVolume += b.Maximum_Monthly_Liters ?? 0;
  });
  const distributorSummary = Object.entries(byDist).map(([distributor, stats]) => ({
    distributor,
    outlets: stats.count,
    totalSpendLKR: Math.round(stats.totalSpend),
    avgVolumeLmo: Math.round(stats.totalVolume / stats.count),
  })).sort((a, b) => b.totalSpendLKR - a.totalSpendLKR);

  // Spend type distribution
  const bySpendType: Record<string, number> = {};
  budget.forEach((b: any) => {
    const s = b.Spend_Type || "unknown";
    bySpendType[s] = (bySpendType[s] || 0) + 1;
  });

  // Constrained outlets (constraint_flag = 1)
  const constrained = budget.filter((b: any) => b.constraint_flag === 1);

  const pageContextData = {
    pageName: "Overview Dashboard",
    metrics: {
      totalOutlets: coords.length,
      westernProvinceOutlets: wpCoords.length,
      westernProvinceShare: `${wpShare}%`,
      avgPredictedVolume: Math.round(avgVolume),
      totalAddressableVolume: Math.round(totalVolume),
      budgetAllocatedOutlets: budget.length,
      totalBudgetUtilized: Math.round(totalBudget),
      budgetUtilizationPercentage: ((totalBudget / 5_000_000) * 100).toFixed(1),
      constrainedOutlets: constrained.length,
      spendTypeDistribution: bySpendType,
    },
    // Top 15 outlets by trade spend
    topOutletsBySpend: sorted.slice(0, 15).map((b: any) => ({
      outletId: b.Outlet_ID,
      type: b.Outlet_Type,
      size: b.Outlet_Size,
      distributor: b.Distributor_ID,
      tradeSpendLKR: Math.round(b.Trade_Spend_LKR),
      predictedVolumeLmo: Math.round(b.Maximum_Monthly_Liters),
      incrementalVolumeLmo: Math.round(b.incremental_volume),
      spendType: b.Spend_Type,
    })),
    // Bottom 15 outlets by predicted volume (worst potential)
    worstOutletsByPotential: sortedByVolume.slice(0, 15).map((b: any) => ({
      outletId: b.Outlet_ID,
      type: b.Outlet_Type,
      size: b.Outlet_Size,
      distributor: b.Distributor_ID,
      predictedVolumeLmo: Math.round(b.Maximum_Monthly_Liters),
      tradeSpendLKR: Math.round(b.Trade_Spend_LKR),
      constraintFlag: b.constraint_flag,
    })),
    // Top 15 outlets by incremental opportunity (highest untapped potential)
    topByIncrementalOpportunity: [...budget]
      .sort((a: any, b: any) => b.incremental_volume - a.incremental_volume)
      .slice(0, 15)
      .map((b: any) => ({
        outletId: b.Outlet_ID,
        type: b.Outlet_Type,
        distributor: b.Distributor_ID,
        incrementalVolumeLmo: Math.round(b.incremental_volume),
        predictedVolumeLmo: Math.round(b.Maximum_Monthly_Liters),
        historicalMax: Math.round(b.historical_max_volume),
      })),
    // Aggregated summaries (safe to always include)
    outletTypeSummary,
    distributorSummary,
  };

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <PageContextSetter data={pageContextData} />

      <div className="px-4 lg:px-6">
        <JitInsights contextData={pageContextData} />
      </div>

      <SectionCards
        cards={
          [
            {
              label: "Total Outlets",
              value: fmtNumber(coords.length),
              extra: "All provinces included",
            },
            {
              label: "Western Province",
              value: fmtNumber(wpCoords.length),
              sub: `${wpShare}% of total`,
            },
            {
              label: "Avg Predicted Volume",
              value: `${fmtNumber(Math.round(avgVolume))} L/mo`,
            },
            {
              label: "Total Addressable Volume",
              value: `${fmtNumber(Math.round(totalVolume))} L/mo`,
            },
            {
              label: "Budget Allocations",
              value: `${fmtNumber(budget.length)} outlets`,
              extra: `${fmtMoney(Math.round(totalBudget))} total`,
            },
            {
              label: "Promo Budget",
              value: fmtMoney(Math.round(totalBudget)),
              sub: "LKR 5M cap",
              extra: `${((totalBudget / 5_000_000) * 100).toFixed(1)}% utilized`,
            },
          ] satisfies CardData[]
        }
      />

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Strategy Summary
            </CardTitle>
            <CardDescription>
              Allocating <strong>{fmtMoney(Math.round(totalBudget))}</strong> in
              promotional trade spend across{" "}
              <strong>{fmtNumber(budget.length)} Western Province outlets</strong> to
              maximize incremental volume. The latent demand model estimates a
              total addressable volume of{" "}
              <strong>{fmtNumber(Math.round(totalVolume))} L/mo</strong> across all{" "}
              {fmtNumber(coords.length)} outlets.
              <br /><br />
              <strong>Budget cap:</strong> LKR 5,000,000 &middot;{" "}
              <strong>Utilized:</strong> {fmtMoney(Math.round(totalBudget))} ({((totalBudget / 5_000_000) * 100).toFixed(1)}%)
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <DataTable data={tableData} />
      </div>
    </div>
  );
}
