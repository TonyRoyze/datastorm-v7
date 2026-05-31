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
  Trade_Spend_LKR?: number
}

function useMapData() {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
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
            !isNaN(o.Longitude)
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
