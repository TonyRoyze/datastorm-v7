"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { usePathname } from "next/navigation"
import dynamic from "next/dynamic"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

const LazyOutletMap = dynamic(() => import("@/components/outlet-map"), {
  ssr: false,
})

interface Outlet {
  Outlet_ID: string
  Maximum_Monthly_Liters: number
  Latitude: number
  Longitude: number
  Distributor_ID?: string
  Outlet_Type?: string
  Outlet_Size?: string
  Cooler_Count?: number
  constraint_flag?: number
  volume_cv?: number
  historical_max_volume?: number
  incremental_volume?: number
  rd_demand_pressure?: number
  Trade_Spend_LKR?: number
  Spend_Type?: string
}

async function fetchJsonRows(filename: string): Promise<any[]> {
  const response = await fetch(`/data/${filename}`, { cache: "no-store" })
  if (!response.ok) return []
  const rows = await response.json()
  return Array.isArray(rows) ? rows : []
}

function asNumber(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function optNumber(value: unknown): number | undefined {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function summarizeOutletRows(rows: Outlet[]) {
  return {
    total: rows.length,
    withType: rows.filter((row) => row.Outlet_Type).length,
    withSize: rows.filter((row) => row.Outlet_Size).length,
    withDistributor: rows.filter((row) => row.Distributor_ID).length,
    withCoolerCount: rows.filter((row) => row.Cooler_Count != null).length,
    hasCooler: rows.filter((row) => (row.Cooler_Count ?? 0) > 0).length,
    explicitNoCooler: rows.filter((row) => row.Cooler_Count === 0).length,
    withTradeSpend: rows.filter((row) => (row.Trade_Spend_LKR ?? 0) > 0).length,
  }
}

function useMapData() {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [outletRows, coords, preds, budget] = await Promise.all([
        fetchJsonRows("outlets.json"),
        fetchJsonRows("outlet_coordinates.json"),
        fetchJsonRows("predictions.json"),
        fetchJsonRows("budget_allocations.json"),
      ])
      if (cancelled) return

      const predMap = new Map(
        preds.map((p: any) => [String(p.Outlet_ID), p.Maximum_Monthly_Liters])
      )
      const budgetMap = new Map(
        budget.map((b: any) => [String(b.Outlet_ID), b])
      )
      const sourceRows = outletRows.length > 0 ? outletRows : coords

      const merged: Outlet[] = sourceRows
        .map((row: any) => {
          const outletId = String(row.Outlet_ID)
          const budgetRow = budgetMap.get(outletId) || {}

          return {
            Outlet_ID: outletId,
            Latitude: asNumber(row.Latitude),
            Longitude: asNumber(row.Longitude),
            Maximum_Monthly_Liters:
              asNumber(row.Maximum_Monthly_Liters) ||
              asNumber(predMap.get(outletId)) ||
              asNumber(budgetRow.Maximum_Monthly_Liters),
            Distributor_ID: String(
              row.Distributor_ID ?? budgetRow.Distributor_ID ?? ""
            ),
            Outlet_Type: String(row.Outlet_Type ?? budgetRow.Outlet_Type ?? ""),
            Outlet_Size: String(row.Outlet_Size ?? budgetRow.Outlet_Size ?? ""),
            Cooler_Count: optNumber(row.Cooler_Count ?? budgetRow.Cooler_Count),
            constraint_flag: optNumber(
              row.constraint_flag ?? budgetRow.constraint_flag
            ),
            volume_cv: optNumber(row.volume_cv ?? budgetRow.volume_cv),
            historical_max_volume: optNumber(
              row.historical_max_volume ?? budgetRow.historical_max_volume
            ),
            incremental_volume: optNumber(
              row.incremental_volume ?? budgetRow.incremental_volume
            ),
            rd_demand_pressure: optNumber(
              row.rd_demand_pressure ?? budgetRow.rd_demand_pressure
            ),
            Trade_Spend_LKR: asNumber(
              row.Trade_Spend_LKR ?? budgetRow.Trade_Spend_LKR
            ),
            Spend_Type: String(row.Spend_Type ?? budgetRow.Spend_Type ?? ""),
          }
        })
        .filter(
          (o) =>
            Number.isFinite(o.Latitude) &&
            Number.isFinite(o.Longitude) &&
            !(o.Latitude === 0 && o.Longitude === 0)
        )

      console.groupCollapsed("[map-data] AppShell source -> merged outlets")
      console.log("source counts", {
        outletsJson: outletRows.length,
        coordinatesJson: coords.length,
        predictionsJson: preds.length,
        budgetAllocationsJson: budget.length,
        sourceFileUsed: outletRows.length > 0 ? "outlets.json" : "outlet_coordinates.json",
      })
      console.log("raw sample OUT_07089", {
        outletsJson: outletRows.find((row: any) => row.Outlet_ID === "OUT_07089"),
        coordinatesJson: coords.find((row: any) => row.Outlet_ID === "OUT_07089"),
        predictionsJson: preds.find((row: any) => row.Outlet_ID === "OUT_07089"),
        budgetAllocationsJson: budget.find((row: any) => row.Outlet_ID === "OUT_07089"),
      })
      console.log("merged summary", summarizeOutletRows(merged))
      console.log(
        "merged sample OUT_07089",
        merged.find((row) => row.Outlet_ID === "OUT_07089")
      )
      console.log("first 5 merged rows", merged.slice(0, 5))
      console.groupEnd()

      setOutlets(merged)
      setLoaded(true)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return { outlets, loaded }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMapPage = pathname === "/map"
  const { outlets, loaded } = useMapData()

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />

        {/* Page content — hidden on map page */}
        <div
          style={{
            display: isMapPage ? "none" : "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          {children}
        </div>

        {/* Map — hidden off-screen on non-map pages, fills layout on map page */}
        <div
          style={
            isMapPage
              ? {
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minHeight: 0,
                  padding: "12px 24px",
                }
              : {
                  position: "absolute",
                  left: "-9999px",
                  top: "-9999px",
                  width: "100vw",
                  height: "100vh",
                  display: "flex",
                  flexDirection: "column",
                }
          }
        >
          <div
            style={{
              border: "1px solid",
              borderColor: "var(--border)",
              borderRadius: 8,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              background: "var(--card)",
              flex: 1,
              minHeight: 0,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid",
                borderColor: "var(--border)",
                fontSize: 14,
                fontWeight: 600,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {loaded ? (
                <>
                  <span>Sri Lanka — Outlet Map</span>
                  <span style={{ color: "var(--muted-foreground)", fontWeight: 400, fontSize: 13 }}>
                    {outlets.length.toLocaleString()} outlets
                  </span>
                </>
              ) : (
                <>
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-20" />
                </>
              )}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              {loaded ? (
                <LazyOutletMap outlets={outlets} />
              ) : null}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
