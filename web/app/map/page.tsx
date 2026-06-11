import fs from "fs"
import path from "path"
import MapCard from "@/components/map-card"

const DATA_DIR = path.join(process.cwd(), "public", "data")

type JsonRecord = Record<string, unknown>

function readJSON(filename: string): JsonRecord[] {
  const filePath = path.join(DATA_DIR, filename)

  if (!fs.existsSync(filePath)) {
    return []
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as JsonRecord[]
}

function asNumber(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function optNumber(value: unknown): number | undefined {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

export default function MapPage() {
  const outletRows = readJSON("outlets.json")
  const coordinates = outletRows.length > 0 ? outletRows : readJSON("outlet_coordinates.json")
  const predictions = readJSON("predictions.json")
  const budgetAllocations = readJSON("budget_allocations.json")

  const predictionByOutlet = new Map(
    predictions.map((row) => [
      String(row.Outlet_ID),
      asNumber(row.Maximum_Monthly_Liters),
    ])
  )
  const budgetByOutlet = new Map(
    budgetAllocations.map((row) => [String(row.Outlet_ID), row])
  )

  const outlets = coordinates
    .map((row) => {
      const outletId = String(row.Outlet_ID)
      const b = budgetByOutlet.get(outletId) || {}

      return {
        Outlet_ID: outletId,
        Latitude: asNumber(row.Latitude),
        Longitude: asNumber(row.Longitude),
        Maximum_Monthly_Liters:
          asNumber(row.Maximum_Monthly_Liters) ||
          predictionByOutlet.get(outletId) ||
          asNumber(b.Maximum_Monthly_Liters),
        Distributor_ID: String(row.Distributor_ID ?? b.Distributor_ID ?? ""),
        Outlet_Type: String(row.Outlet_Type ?? b.Outlet_Type ?? ""),
        Outlet_Size: String(row.Outlet_Size ?? b.Outlet_Size ?? ""),
        Cooler_Count: asNumber(row.Cooler_Count ?? b.Cooler_Count),
        constraint_flag: optNumber(row.constraint_flag ?? b.constraint_flag),
        volume_cv: optNumber(row.volume_cv ?? b.volume_cv),
        historical_max_volume: optNumber(row.historical_max_volume ?? b.historical_max_volume),
        incremental_volume: optNumber(row.incremental_volume ?? b.incremental_volume),
        rd_demand_pressure: optNumber(row.rd_demand_pressure ?? b.rd_demand_pressure),
        Trade_Spend_LKR: asNumber(row.Trade_Spend_LKR ?? b.Trade_Spend_LKR),
        Spend_Type: String(row.Spend_Type ?? b.Spend_Type ?? "Not funded"),
      }
    })
    .filter(
      (row) =>
        Number.isFinite(row.Latitude) &&
        Number.isFinite(row.Longitude) &&
        !(row.Latitude === 0 && row.Longitude === 0)
    )

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-lg font-semibold">Outlet Map</h1>
        <p className="text-sm text-muted-foreground">
          All mapped outlets with clustered hotspot coloring and demand hotspot
          regions.
        </p>
      </div>

      <div className="px-4 lg:px-6">
        <MapCard outlets={outlets} />
      </div>
    </div>
  )
}
