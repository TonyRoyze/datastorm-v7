"use client"

import dynamic from "next/dynamic"

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

const OutletMap = dynamic(() => import("@/components/outlet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-13rem)] min-h-[560px] items-center justify-center rounded-md border bg-card text-sm text-muted-foreground">
      Loading outlet map...
    </div>
  ),
})

export default function MapCard({ outlets }: { outlets: Outlet[] }) {
  return <OutletMap outlets={outlets} />
}
