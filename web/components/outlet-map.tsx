"use client"

import { useEffect } from "react"
import { useMap } from "react-leaflet"
import L from "leaflet"
import type { LatLngExpression } from "leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import {
  Map,
  MapTileLayer,
  MapCircleMarker,
  MapPopup,
  MapZoomControl,
} from "@/components/ui/map"

interface Outlet {
  Outlet_ID: string
  Maximum_Monthly_Liters: number
  Latitude: number
  Longitude: number
  Trade_Spend_LKR?: number
}

interface Props {
  outlets: Outlet[]
}

function getColor(v: number): string {
  if (v > 20000) return "#dc2626"
  if (v > 10000) return "#ea580c"
  if (v > 5000) return "#ca8a04"
  if (v > 2000) return "#65a30d"
  return "#2563eb"
}

function BoundsUpdater({ outlets }: { outlets: Outlet[] }) {
  const map = useMap()
  useEffect(() => {
    if (outlets.length === 0) return
    const coords = outlets.map(
      (o) => [o.Latitude, o.Longitude] as [number, number]
    )
    map.fitBounds(L.latLngBounds(coords))
  }, [outlets, map])
  return null
}

function MapResizer() {
  const map = useMap()
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      try {
        map.invalidateSize()
      } catch {}
    })
    const el = map.getContainer().parentElement
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [map])
  return null
}

const fmt = (v: number) =>
  v.toLocaleString(undefined, { maximumFractionDigits: 0 })

export default function OutletMap({ outlets }: Props) {
  const maxVol = Math.max(...outlets.map((o) => o.Maximum_Monthly_Liters), 1)
  const minVol = Math.min(...outlets.map((o) => o.Maximum_Monthly_Liters))
  const COLOMBO_COORDINATES = [6.920575, 79.859823] satisfies LatLngExpression

  return (
    <Map center={COLOMBO_COORDINATES} zoom={8} className="h-full w-full">
      <MapTileLayer attribution="&copy; OpenStreetMap contributors" />
      <MapZoomControl />
      <BoundsUpdater outlets={outlets} />
      <MapResizer />

      <MarkerClusterGroup chunkedLoading>
        {outlets.map((o) => {
          const vol = o.Maximum_Monthly_Liters
          const radius = 3 + ((vol - minVol) / (maxVol - minVol || 1)) * 8

          return (
            <MapCircleMarker
              key={o.Outlet_ID}
              center={[o.Latitude, o.Longitude]}
              radius={radius}
              pathOptions={{
                color: getColor(vol),
                fillColor: getColor(vol),
                fillOpacity: 0.7,
                weight: 1,
              }}
            >
              <MapPopup>
                <div
                  style={{
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 13,
                    lineHeight: 1.4,
                    minWidth: 160,
                  }}
                >
                  <p style={{ fontWeight: 600, margin: 0 }}>{o.Outlet_ID}</p>
                  <p style={{ color: "#666", margin: "2px 0" }}>
                    <strong>{fmt(vol)}</strong> L/mo
                  </p>
                  {o.Trade_Spend_LKR ? (
                    <p style={{ fontSize: 12, color: "#16a34a", margin: 0 }}>
                      LKR {fmt(o.Trade_Spend_LKR)} promo
                    </p>
                  ) : null}
                </div>
              </MapPopup>
            </MapCircleMarker>
          )
        })}
      </MarkerClusterGroup>
    </Map>
  )
}
