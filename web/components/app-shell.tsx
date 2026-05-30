"use client"

import { useEffect, useState } from "react"
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
  Trade_Spend_LKR?: number
}

function isWesternProvince(lat: number, lng: number) {
  return lat >= 6.4 && lat <= 7.2 && lng >= 79.7 && lng <= 80.2
}

function useMapData() {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    import("@/components/outlet-map")

    let cancelled = false
    async function load() {
      const [coords, preds, budget] = await Promise.all([
        fetch("/data/outlet_coordinates.json").then((r) => r.json()),
        fetch("/data/predictions.json").then((r) => r.json()),
        fetch("/data/budget_allocations.json").then((r) => r.json()),
      ])
      if (cancelled) return

      const predMap = new Map(
        preds.map((p: any) => [p.Outlet_ID, p.Maximum_Monthly_Liters])
      )
      const budgetMap = new Map(
        budget.map((b: any) => [b.Outlet_ID, b.Trade_Spend_LKR])
      )

      const merged: Outlet[] = coords
        .map((c: any) => ({
          Outlet_ID: c.Outlet_ID,
          Latitude: c.Latitude,
          Longitude: c.Longitude,
          Maximum_Monthly_Liters: predMap.get(c.Outlet_ID) ?? 0,
          Trade_Spend_LKR: budgetMap.get(c.Outlet_ID) ?? 0,
        }))
        .filter(
          (o: any) =>
            typeof o.Latitude === "number" &&
            typeof o.Longitude === "number" &&
            !isNaN(o.Latitude) &&
            !isNaN(o.Longitude) &&
            isWesternProvince(o.Latitude, o.Longitude)
        )

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
          {loaded && (
            <div
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: 8,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                background: "#fff",
                flex: 1,
                minHeight: 0,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid #e5e5e5",
                  fontSize: 14,
                  fontWeight: 600,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Western Province — Outlet Map</span>
                <span style={{ color: "#666", fontWeight: 400, fontSize: 13 }}>
                  {outlets.length.toLocaleString()} outlets
                </span>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <LazyOutletMap outlets={outlets} />
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
