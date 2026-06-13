import fs from "fs"
import path from "path"
import { cache } from "react"

const DATA_DIR = path.join(process.cwd(), "public", "data")
const fsPromises = fs.promises
const TOTAL_BUDGET_LKR = 5_000_000

export type DataRow = {
  [key: string]: string | number | null | undefined
  Cooler_Count?: number
  Distributor_ID?: string
  Latitude?: number
  Longitude?: number
  Maximum_Monthly_Liters?: number
  Outlet_ID?: string
  Outlet_Size?: string
  Outlet_Type?: string
  Spend_Type?: string
  Trade_Spend_LKR?: number
  constraint_flag?: number
  historical_max_volume?: number
  incremental_volume?: number
  rd_demand_pressure?: number
  volume_cv?: number
}

const readJSON = cache(async (filename: string): Promise<DataRow[]> => {
  const p = path.join(DATA_DIR, filename)
  if (!fs.existsSync(p)) return []
  const fileContent = await fsPromises.readFile(p, "utf-8")
  return JSON.parse(fileContent) as DataRow[]
})

const isWesternProvince = (lat: number, lng: number) =>
  lat >= 6.4 && lat <= 7.2 && lng >= 79.7 && lng <= 80.2

const safeRound = (value: number | undefined | null) => Math.round(value ?? 0)

export async function getDashboardData() {
  const coords = await readJSON("outlet_coordinates.json")
  const preds = await readJSON("predictions.json")
  const budget = await readJSON("budget_allocations.json")
  const outlets = await readJSON("outlets.json")

  const predictionByOutlet = new Map(
    preds.map((p) => [p.Outlet_ID, p.Maximum_Monthly_Liters ?? 0])
  )
  const budgetByOutlet = new Map(
    budget.map((b) => [b.Outlet_ID, b])
  )

  const allOutletRows: DataRow[] =
    outlets.length > 0
      ? outlets.map((outlet) => ({
          ...outlet,
          ...(budgetByOutlet.get(outlet.Outlet_ID) ?? {}),
          Maximum_Monthly_Liters:
            outlet.Maximum_Monthly_Liters ??
            budgetByOutlet.get(outlet.Outlet_ID)?.Maximum_Monthly_Liters ??
            0,
          Trade_Spend_LKR:
            budgetByOutlet.get(outlet.Outlet_ID)?.Trade_Spend_LKR ??
            outlet.Trade_Spend_LKR ??
            0,
          Spend_Type:
            budgetByOutlet.get(outlet.Outlet_ID)?.Spend_Type ??
            outlet.Spend_Type ??
            "Not funded",
        }))
      : coords.map((coord) => ({
          Outlet_ID: coord.Outlet_ID,
          Latitude: coord.Latitude,
          Longitude: coord.Longitude,
          Maximum_Monthly_Liters: predictionByOutlet.get(coord.Outlet_ID) ?? 0,
          ...(budgetByOutlet.get(coord.Outlet_ID) ?? {}),
          Trade_Spend_LKR:
            budgetByOutlet.get(coord.Outlet_ID)?.Trade_Spend_LKR ?? 0,
          Spend_Type:
            budgetByOutlet.get(coord.Outlet_ID)?.Spend_Type ?? "Not funded",
        }))

  const validCoords = coords.filter(
    (c) => typeof c.Latitude === "number" && typeof c.Longitude === "number"
  )
  const wpCoords = validCoords.filter((c) =>
    isWesternProvince(c.Latitude ?? 0, c.Longitude ?? 0)
  )

  const totalVolume = preds.reduce(
    (s, p) => s + (p.Maximum_Monthly_Liters ?? 0),
    0
  )
  const avgVolume = preds.length ? totalVolume / preds.length : 0
  const totalBudget = budget.reduce(
    (s, b) => s + (b.Trade_Spend_LKR ?? 0),
    0
  )
  const totalIncrementalVolume = budget.reduce(
    (s, b) => s + (b.incremental_volume ?? 0),
    0
  )
  const wpShare =
    validCoords.length > 0
      ? ((wpCoords.length / validCoords.length) * 100).toFixed(1)
      : "0"

  const sorted = [...allOutletRows].sort(
    (a, b) => (b.Trade_Spend_LKR ?? 0) - (a.Trade_Spend_LKR ?? 0)
  )
  const fundedSorted = [...budget].sort(
    (a, b) => (b.Trade_Spend_LKR ?? 0) - (a.Trade_Spend_LKR ?? 0)
  )
  const sortedByVolume = [...budget].sort(
    (a, b) => (a.Maximum_Monthly_Liters ?? 0) - (b.Maximum_Monthly_Liters ?? 0)
  )
  const sortedByIncremental = [...budget].sort(
    (a, b) => (b.incremental_volume ?? 0) - (a.incremental_volume ?? 0)
  )
  const sortedByEfficiency = [...budget]
    .filter((b) => (b.incremental_volume ?? 0) > 0)
    .sort(
      (a, b) =>
        (a.Trade_Spend_LKR ?? 0) / (a.incremental_volume ?? 1) -
        (b.Trade_Spend_LKR ?? 0) / (b.incremental_volume ?? 1)
    )

  const tableData = sorted.map((b) => ({
    Outlet_ID: String(b.Outlet_ID ?? ""),
    Distributor_ID: b.Distributor_ID,
    Outlet_Type: b.Outlet_Type,
    Outlet_Size: b.Outlet_Size,
    Cooler_Count: b.Cooler_Count,
    constraint_flag: b.constraint_flag,
    volume_cv: b.volume_cv,
    historical_max_volume: b.historical_max_volume,
    Maximum_Monthly_Liters: b.Maximum_Monthly_Liters,
    incremental_volume: b.incremental_volume ?? 0,
    Trade_Spend_LKR: b.Trade_Spend_LKR ?? 0,
    Spend_Type: b.Spend_Type ?? "Not funded",
  }))

  const byType: Record<
    string,
    {
      count: number
      totalSpend: number
      totalVolume: number
      totalIncremental: number
    }
  > = {}
  budget.forEach((b) => {
    const t = b.Outlet_Type || "Unknown"
    if (!byType[t]) {
      byType[t] = {
        count: 0,
        totalSpend: 0,
        totalVolume: 0,
        totalIncremental: 0,
      }
    }
    byType[t].count++
    byType[t].totalSpend += b.Trade_Spend_LKR ?? 0
    byType[t].totalVolume += b.Maximum_Monthly_Liters ?? 0
    byType[t].totalIncremental += b.incremental_volume ?? 0
  })
  const outletTypeSummary = Object.entries(byType)
    .map(([type, stats]) => ({
      type,
      count: stats.count,
      avgSpendLKR: Math.round(stats.totalSpend / stats.count),
      avgVolumeLmo: Math.round(stats.totalVolume / stats.count),
      totalSpendLKR: Math.round(stats.totalSpend),
      totalIncrementalLmo: Math.round(stats.totalIncremental),
      spendShare:
        totalBudget > 0 ? (stats.totalSpend / totalBudget) * 100 : 0,
    }))
    .sort((a, b) => b.totalSpendLKR - a.totalSpendLKR)

  const byDist: Record<
    string,
    { count: number; totalSpend: number; totalVolume: number }
  > = {}
  budget.forEach((b) => {
    const d = b.Distributor_ID || "Unknown"
    if (!byDist[d]) byDist[d] = { count: 0, totalSpend: 0, totalVolume: 0 }
    byDist[d].count++
    byDist[d].totalSpend += b.Trade_Spend_LKR ?? 0
    byDist[d].totalVolume += b.Maximum_Monthly_Liters ?? 0
  })
  const distributorSummary = Object.entries(byDist)
    .map(([distributor, stats]) => ({
      distributor,
      outlets: stats.count,
      totalSpendLKR: Math.round(stats.totalSpend),
      avgVolumeLmo: Math.round(stats.totalVolume / stats.count),
      spendShare:
        totalBudget > 0 ? (stats.totalSpend / totalBudget) * 100 : 0,
    }))
    .sort((a, b) => b.totalSpendLKR - a.totalSpendLKR)

  const bySpendType: Record<
    string,
    { count: number; spend: number; volume: number; incremental: number }
  > = {}
  budget.forEach((b) => {
    const s = b.Spend_Type || "unknown"
    if (!bySpendType[s]) {
      bySpendType[s] = { count: 0, spend: 0, volume: 0, incremental: 0 }
    }
    bySpendType[s].count++
    bySpendType[s].spend += b.Trade_Spend_LKR ?? 0
    bySpendType[s].volume += b.Maximum_Monthly_Liters ?? 0
    bySpendType[s].incremental += b.incremental_volume ?? 0
  })
  const spendTypeSummary = Object.entries(bySpendType)
    .map(([type, stats]) => ({
      type,
      count: stats.count,
      spendLKR: Math.round(stats.spend),
      volumeLmo: Math.round(stats.volume),
      incrementalLmo: Math.round(stats.incremental),
      spendShare: totalBudget > 0 ? (stats.spend / totalBudget) * 100 : 0,
      avgSpendLKR: Math.round(stats.spend / stats.count),
    }))
    .sort((a, b) => b.spendLKR - a.spendLKR)

  const constrained = budget.filter((b) => b.constraint_flag === 1)
  const constrainedSpend = constrained.reduce(
    (s, b) => s + (b.Trade_Spend_LKR ?? 0),
    0
  )
  const top10Spend = fundedSorted
    .slice(0, 10)
    .reduce((s, b) => s + (b.Trade_Spend_LKR ?? 0), 0)

  const pageContextData = {
    pageName: "AI Budget Overview",
    metrics: {
      totalOutlets: coords.length,
      westernProvinceOutlets: wpCoords.length,
      westernProvinceShare: `${wpShare}%`,
      avgPredictedVolume: safeRound(avgVolume),
      totalAddressableVolume: safeRound(totalVolume),
      budgetAllocatedOutlets: budget.length,
      totalBudgetUtilized: safeRound(totalBudget),
      budgetUtilizationPercentage: ((totalBudget / TOTAL_BUDGET_LKR) * 100).toFixed(1),
      totalIncrementalVolume: safeRound(totalIncrementalVolume),
      costPerIncrementalLiter:
        totalIncrementalVolume > 0 ? totalBudget / totalIncrementalVolume : 0,
      constrainedOutlets: constrained.length,
      constrainedSpend: safeRound(constrainedSpend),
      spendTypeDistribution: Object.fromEntries(
        Object.entries(bySpendType).map(([type, stats]) => [type, stats.count])
      ),
    },
    topOutletsBySpend: sorted.slice(0, 15).map((b) => ({
      outletId: b.Outlet_ID,
      type: b.Outlet_Type,
      size: b.Outlet_Size,
      distributor: b.Distributor_ID,
      tradeSpendLKR: safeRound(b.Trade_Spend_LKR),
      predictedVolumeLmo: safeRound(b.Maximum_Monthly_Liters),
      incrementalVolumeLmo: safeRound(b.incremental_volume),
      spendType: b.Spend_Type,
    })),
    worstOutletsByPotential: sortedByVolume.slice(0, 15).map((b) => ({
      outletId: b.Outlet_ID,
      type: b.Outlet_Type,
      size: b.Outlet_Size,
      distributor: b.Distributor_ID,
      predictedVolumeLmo: safeRound(b.Maximum_Monthly_Liters),
      tradeSpendLKR: safeRound(b.Trade_Spend_LKR),
      constraintFlag: b.constraint_flag,
    })),
    topByIncrementalOpportunity: sortedByIncremental.slice(0, 15).map((b) => ({
      outletId: b.Outlet_ID,
      type: b.Outlet_Type,
      distributor: b.Distributor_ID,
      incrementalVolumeLmo: safeRound(b.incremental_volume),
      predictedVolumeLmo: safeRound(b.Maximum_Monthly_Liters),
      historicalMax: safeRound(b.historical_max_volume),
    })),
    outletTypeSummary,
    distributorSummary,
  }

  return {
    totalBudgetCap: TOTAL_BUDGET_LKR,
    coords,
    preds,
    budget,
    outlets,
    tableData,
    pageContextData,
    metrics: {
      totalOutlets: coords.length,
      totalFundedOutlets: budget.length,
      validCoords: validCoords.length,
      westernProvinceOutlets: wpCoords.length,
      westernProvinceShare: Number(wpShare),
      totalVolume: safeRound(totalVolume),
      avgVolume: safeRound(avgVolume),
      totalBudget: safeRound(totalBudget),
      budgetUtilization: totalBudget / TOTAL_BUDGET_LKR,
      totalIncrementalVolume: safeRound(totalIncrementalVolume),
      costPerIncrementalLiter:
        totalIncrementalVolume > 0 ? totalBudget / totalIncrementalVolume : 0,
      constrainedOutlets: constrained.length,
      constrainedSpend: safeRound(constrainedSpend),
      constrainedSpendShare:
        totalBudget > 0 ? (constrainedSpend / totalBudget) * 100 : 0,
      top10SpendShare: totalBudget > 0 ? (top10Spend / totalBudget) * 100 : 0,
      averageSpendPerFundedOutlet:
        budget.length > 0 ? safeRound(totalBudget / budget.length) : 0,
    },
    spendTypeSummary,
    outletTypeSummary,
    distributorSummary,
    highlightedOutlets: {
      highestSpend: fundedSorted.slice(0, 5),
      incrementalLeaders: sortedByIncremental.slice(0, 5),
      mostEfficient: sortedByEfficiency.slice(0, 5),
      constrainedPriority: constrained
        .sort((a, b) => (b.Trade_Spend_LKR ?? 0) - (a.Trade_Spend_LKR ?? 0))
        .slice(0, 5),
    },
  }
}
