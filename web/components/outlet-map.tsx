"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet.markercluster"
import { Loader2, SlidersHorizontal, Sparkles } from "lucide-react"
import type { PlaceFeature } from "@/components/ui/place-autocomplete"
import { Button } from "@/components/ui/button"
import { CoordinateOffset } from "@/components/coordinate-offset"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { LatLngExpression } from "leaflet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Map,
  MapControlContainer,
  MapLayers,
  MapLayersControl,
  MapLayerGroup,
  MapSearchControl,
  MapTileLayer,
  MapZoomControl,
} from "@/components/ui/map"

const COLOMBO_COORDINATES: LatLngExpression = [6.9271, 79.8612]

const TYPE_MAP: Record<string, string> = {
  Kade: "kade",
  Grocery: "grocery",
  Grocry: "grocery",
  Eatery: "eatery",
  " Eatery ": "eatery",
  Bakery: "eatery",
  Bakry: "eatery",
  Pharmacy: "pharmacy",
  Hotel: "other",
  SMMT: "other",
}

const TYPE_ORDER = ["kade", "grocery", "eatery", "pharmacy", "other"] as const
type OutletType = (typeof TYPE_ORDER)[number]
type VolumeFilter = "all" | "major" | "high" | "growth" | "small"
type HotspotFilter = "all" | "hotspot" | "standard"
type SpendFilter = "all" | "allocated" | "unallocated"
type CoolerFilter = "all" | "has-cooler" | "no-cooler"

interface MapFilters {
  volume: VolumeFilter
  hotspot: HotspotFilter
  spend: SpendFilter
  cooler: CoolerFilter
}

const TYPE_LABEL: Record<OutletType, string> = {
  kade: "Kade",
  grocery: "Grocery",
  eatery: "Eatery",
  pharmacy: "Pharmacy",
  other: "Other",
}

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

interface Props {
  outlets: Outlet[]
}

interface InsightResult {
  verdict: string
  positiveDrivers: string[]
  negativeConstraints: string[]
  recommendedAction: string
}

function normalizeType(raw: string | undefined): OutletType {
  if (!raw) return "other"
  const t = TYPE_MAP[raw.trim()]
  return TYPE_ORDER.includes(t as OutletType) ? (t as OutletType) : "other"
}

function getLatentPotential(o: Outlet) {
  return (
    o.incremental_volume ??
    (o.historical_max_volume != null
      ? Math.max(o.Maximum_Monthly_Liters - o.historical_max_volume, 0)
      : o.Maximum_Monthly_Liters)
  )
}

function isHotspotOutlet(o: Outlet, hotspotThreshold: number) {
  return o.rd_demand_pressure != null
    ? o.rd_demand_pressure >= 0.7
    : getLatentPotential(o) >= hotspotThreshold
}

function matchesFilters(
  outlet: Outlet,
  filters: MapFilters,
  hotspotThreshold: number
) {
  const volume = outlet.Maximum_Monthly_Liters

  if (filters.volume === "major" && volume < 1500) return false
  if (filters.volume === "high" && (volume < 1000 || volume >= 1500))
    return false
  if (filters.volume === "growth" && (volume < 500 || volume >= 1000))
    return false
  if (filters.volume === "small" && volume >= 500) return false

  const isHotspot = isHotspotOutlet(outlet, hotspotThreshold)
  if (filters.hotspot === "hotspot" && !isHotspot) return false
  if (filters.hotspot === "standard" && isHotspot) return false

  const hasSpend = (outlet.Trade_Spend_LKR ?? 0) > 0
  if (filters.spend === "allocated" && !hasSpend) return false
  if (filters.spend === "unallocated" && hasSpend) return false

  const coolerCount = outlet.Cooler_Count
  const hasCoolerData = coolerCount != null
  const hasCooler = coolerCount != null && coolerCount > 0
  const hasExplicitNoCooler = coolerCount === 0
  if (filters.cooler === "has-cooler" && !hasCooler) return false
  if (filters.cooler === "no-cooler" && !hasExplicitNoCooler) return false

  return true
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

function ClusterIcon({ count }: { count: number }) {
  return `<div style="width:40px;height:40px;border-radius:50%;border:2px solid white;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:white;box-shadow:0 2px 6px rgba(0,0,0,.3)">${count}</div>`
}

function quantile(values: number[], q: number) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base]
}

function summarizeOutlets(rows: Outlet[]) {
  return {
    total: rows.length,
    withType: rows.filter((row) => row.Outlet_Type).length,
    withSize: rows.filter((row) => row.Outlet_Size).length,
    withDistributor: rows.filter((row) => row.Distributor_ID).length,
    withCoolerCount: rows.filter((row) => row.Cooler_Count != null).length,
    hasCooler: rows.filter((row) => (row.Cooler_Count ?? 0) > 0).length,
    explicitNoCooler: rows.filter((row) => row.Cooler_Count === 0).length,
    missingCooler: rows.filter((row) => row.Cooler_Count == null).length,
    withTradeSpend: rows.filter((row) => (row.Trade_Spend_LKR ?? 0) > 0).length,
  }
}

function markerHtml(color: string) {
  return `<div style="width:28px;height:28px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3)"><div style="width:7px;height:7px;border-radius:50%;background:white"></div></div>`
}

function buildFallbackInsight(outlet: Outlet): InsightResult {
  const predicted = fmt(outlet.Maximum_Monthly_Liters)
  const incremental =
    outlet.incremental_volume != null ? fmt(outlet.incremental_volume) : "N/A"

  return {
    verdict: `${outlet.Outlet_ID} is a ${outlet.Outlet_Size || "unknown-size"} ${outlet.Outlet_Type || "outlet"} with predicted potential of ${predicted} L/mo and incremental upside of ${incremental} L/mo.`,
    positiveDrivers: [
      `${outlet.Outlet_Size || "Unknown"} outlet profile`,
      `${outlet.Cooler_Count ?? 0} cooler unit${outlet.Cooler_Count === 1 ? "" : "s"}`,
    ],
    negativeConstraints: [
      outlet.constraint_flag
        ? "Constraint flag is active"
        : "No active constraint flag",
    ],
    recommendedAction: outlet.Trade_Spend_LKR
      ? `Review ${outlet.Spend_Type || "trade"} spend of LKR ${fmt(outlet.Trade_Spend_LKR)} against the outlet's utilization gap.`
      : "Review outlet fit before allocating additional promotional spend.",
  }
}

function OutletMarkers({
  outlets,
  onSelect,
}: {
  outlets: Outlet[]
  onSelect: (o: Outlet) => void
}) {
  const map = useMap()

  useEffect(() => {
    if (outlets.length === 0) return
    let clusterGroup: L.MarkerClusterGroup | null = null
    const mountTimer = window.setTimeout(() => {
      clusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        chunkedLoading: true,
        iconCreateFunction(cluster) {
          return L.divIcon({
            html: ClusterIcon({ count: cluster.getChildCount() }),
            className: "outlet-cluster-icon",
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          })
        },
      })
      for (const o of outlets) {
        const marker = L.marker([o.Latitude, o.Longitude], {
          icon: L.divIcon({
            html: markerHtml(getColor(o.Maximum_Monthly_Liters)),
            className: "outlet-marker-icon",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        })
        marker.on("click", () => onSelect(o))
        clusterGroup.addLayer(marker)
      }
      map.addLayer(clusterGroup)
    }, 0)
    return () => {
      window.clearTimeout(mountTimer)
      if (clusterGroup) {
        clusterGroup.clearLayers()
        if (map.hasLayer(clusterGroup)) map.removeLayer(clusterGroup)
      }
    }
  }, [map, outlets, onSelect])

  return null
}

function MapFilterControl({
  filters,
  filteredCount,
  totalCount,
  onFiltersChange,
}: {
  filters: MapFilters
  filteredCount: number
  totalCount: number
  onFiltersChange: (filters: MapFilters) => void
}) {
  const activeCount = [
    filters.volume !== "all",
    filters.hotspot !== "all",
    filters.spend !== "all",
    filters.cooler !== "all",
  ].filter(Boolean).length

  return (
    <MapControlContainer className="top-1 right-12">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="Filter outlets"
            title="Filter outlets"
            className="border"
          >
            <SlidersHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-1000 w-56">
          <DropdownMenuLabel>
            {fmt(filteredCount)} of {fmt(totalCount)} outlets
            {activeCount > 0 ? ` · ${activeCount} active` : ""}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Volume</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={filters.volume}
            onValueChange={(volume) =>
              onFiltersChange({ ...filters, volume: volume as VolumeFilter })
            }
          >
            <DropdownMenuRadioItem value="all">
              All volumes
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="major">
              1,500+ L
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="high">
              1,000-1,500 L
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="growth">
              500-1,000 L
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="small">
              Below 500 L
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Demand Signal</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={filters.hotspot}
            onValueChange={(hotspot) =>
              onFiltersChange({ ...filters, hotspot: hotspot as HotspotFilter })
            }
          >
            <DropdownMenuRadioItem value="all">
              All signals
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="hotspot">
              Hot spots
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="standard">
              Standard catchments
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Promo Spend</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={filters.spend}
            onValueChange={(spend) =>
              onFiltersChange({ ...filters, spend: spend as SpendFilter })
            }
          >
            <DropdownMenuRadioItem value="all">
              All outlets
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="allocated">
              Allocated
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="unallocated">
              Unallocated
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Coolers</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={filters.cooler}
            onValueChange={(cooler) =>
              onFiltersChange({ ...filters, cooler: cooler as CoolerFilter })
            }
          >
            <DropdownMenuRadioItem value="all">
              All cooler states
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="has-cooler">
              Has cooler
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="no-cooler">
              No cooler
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </MapControlContainer>
  )
}

function SearchHandler({
  onPlaceSelect,
}: {
  onPlaceSelect: (feature: PlaceFeature) => void
}) {
  const map = useMap()
  const handleSelect = useCallback(
    (feature: PlaceFeature) => {
      const [lng, lat] = feature.geometry.coordinates
      map.flyTo([lat, lng], 15, { duration: 1.5 })
      onPlaceSelect(feature)
    },
    [map, onPlaceSelect]
  )
  return <MapSearchControl onPlaceSelect={handleSelect} />
}

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  const map = useMap()
  useEffect(() => {
    map.on("click", onMapClick)
    return () => {
      map.off("click", onMapClick)
    }
  }, [map, onMapClick])
  return null
}

export default function OutletMap({ outlets }: Props) {
  const [filters, setFilters] = useState<MapFilters>({
    volume: "all",
    hotspot: "all",
    spend: "all",
    cooler: "all",
  })
  const hotspotThreshold = useMemo(
    () =>
      quantile(
        outlets.map((o) => o.incremental_volume ?? o.Maximum_Monthly_Liters),
        0.75
      ),
    [outlets]
  )
  const filteredOutlets = useMemo(
    () =>
      outlets.filter((outlet) =>
        matchesFilters(outlet, filters, hotspotThreshold)
      ),
    [filters, hotspotThreshold, outlets]
  )

  useEffect(() => {
    console.groupCollapsed("[map-data] OutletMap props -> filtered outlets")
    console.log("filters", filters)
    console.log("incoming summary", summarizeOutlets(outlets))
    console.log("filtered summary", summarizeOutlets(filteredOutlets))
    console.log(
      "incoming sample OUT_07089",
      outlets.find((row) => row.Outlet_ID === "OUT_07089")
    )
    console.log("first 5 incoming rows", outlets.slice(0, 5))
    console.groupEnd()
  }, [filteredOutlets, filters, outlets])
  const [latOff, setLatOff] = useState(0.01)
  const [lngOff, setLngOff] = useState(0.01)

  const offsetOutlets = useMemo(
    () =>
      filteredOutlets.map((o) => ({
        ...o,
        Latitude: o.Latitude + latOff,
        Longitude: o.Longitude + lngOff,
      })),
    [filteredOutlets, latOff, lngOff]
  )

  const outletsByType = useMemo(() => {
    const groups: Record<OutletType, Outlet[]> = {
      kade: [],
      grocery: [],
      eatery: [],
      pharmacy: [],
      other: [],
    }
    for (const outlet of offsetOutlets) {
      groups[normalizeType(outlet.Outlet_Type)].push(outlet)
    }
    return groups
  }, [offsetOutlets])

  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null)
  const [insightCache, setInsightCache] = useState<
    globalThis.Map<string, InsightResult>
  >(
    () => new globalThis.Map()
  )
  const [loadingInsightId, setLoadingInsightId] = useState<string | null>(null)
  const handleSelect = useCallback((o: Outlet) => {
    console.log("[map-data] selected outlet", o)
    setSelectedOutlet(o)
  }, [])

  const selectedInsight = selectedOutlet
    ? insightCache.get(selectedOutlet.Outlet_ID)
    : undefined
  const isGeneratingInsight =
    selectedOutlet != null && loadingInsightId === selectedOutlet.Outlet_ID

  const handleGenerateInsight = useCallback(async () => {
    if (!selectedOutlet || insightCache.has(selectedOutlet.Outlet_ID)) return

    setLoadingInsightId(selectedOutlet.Outlet_ID)
    try {
      const response = await fetch("/api/outlet-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet: selectedOutlet }),
      })
      const data = (await response.json()) as InsightResult
      setInsightCache((prev) =>
        new globalThis.Map(prev).set(selectedOutlet.Outlet_ID, data)
      )
    } catch {
      setInsightCache((prev) =>
        new globalThis.Map(prev).set(
          selectedOutlet.Outlet_ID,
          buildFallbackInsight(selectedOutlet)
        )
      )
    } finally {
      setLoadingInsightId(null)
    }
  }, [insightCache, selectedOutlet])

  const isHotspot = selectedOutlet
    ? isHotspotOutlet(selectedOutlet, hotspotThreshold)
    : false
  const selectedType = selectedOutlet
    ? TYPE_LABEL[normalizeType(selectedOutlet.Outlet_Type)]
    : ""

  return (
    <Popover
      open={selectedOutlet != null}
      onOpenChange={(open) => {
        if (!open) setSelectedOutlet(null)
      }}
    >
    <Map center={COLOMBO_COORDINATES} zoom={8} className="h-full w-full">
      <MapLayers
        defaultTileLayer="Default"
        defaultLayerGroups={["Kade", "Grocery", "Eatery", "Pharmacy", "Other"]}
      >
        <MapTileLayer name="Default" />
        <MapTileLayer
          name="OSM"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <MapTileLayer
          name="Satellite"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="&copy; Esri"
        />
        <MapZoomControl position="bottom-1 left-1" />
        <MapLayersControl position="top-1 right-1" />
        <MapFilterControl
          filters={filters}
          filteredCount={filteredOutlets.length}
          totalCount={outlets.length}
          onFiltersChange={setFilters}
        />
        <SearchHandler onPlaceSelect={() => {}} />
        <BoundsUpdater outlets={offsetOutlets} />
        <MapResizer />
        <MapClickHandler onMapClick={() => setSelectedOutlet(null)} />
        {TYPE_ORDER.map((type) => (
          <MapLayerGroup key={type} name={TYPE_LABEL[type]}>
            <OutletMarkers
              outlets={outletsByType[type]}
              onSelect={handleSelect}
            />
          </MapLayerGroup>
        ))}
      </MapLayers>
      <PopoverTrigger asChild>
        <button className="absolute bottom-4 right-4 size-0 opacity-0 pointer-events-none" />
      </PopoverTrigger>
    </Map>
    <PopoverContent
      side="top"
      align="end"
      className="z-[9999] w-80 p-0"
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <div className="space-y-2 p-4">
            <div className="mb-1 flex items-start justify-between gap-2 border-b pb-2">
              <div>
                <p className="text-sm font-semibold">
                  {selectedOutlet?.Outlet_ID}
                </p>
                <p className="text-xs text-muted-foreground">{selectedType}</p>
              </div>
              {selectedOutlet && (
                <Badge variant={isHotspot ? "default" : "secondary"}>
                  {isHotspot ? "Hot spot" : "Standard"}
                </Badge>
              )}
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Max monthly</span>
              <span className="font-bold">
                {selectedOutlet
                  ? fmt(selectedOutlet.Maximum_Monthly_Liters)
                  : ""}{" "}
                L
              </span>
            </div>
            {selectedOutlet?.historical_max_volume != null && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Historical max</span>
                <span className="font-medium">
                  {fmt(selectedOutlet.historical_max_volume)} L
                </span>
              </div>
            )}
            {selectedOutlet?.incremental_volume != null && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Incremental vol</span>
                <span className="font-medium">
                  {fmt(selectedOutlet.incremental_volume)} L
                </span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">
                {selectedOutlet?.Outlet_Type || "Unknown"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Size</span>
              <span className="font-medium">
                {selectedOutlet?.Outlet_Size || "Unknown"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Coolers</span>
              <span className="font-medium">
                {selectedOutlet?.Cooler_Count != null
                  ? fmt(selectedOutlet.Cooler_Count)
                  : "N/A"}
              </span>
            </div>
            {selectedOutlet?.Distributor_ID && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Distributor</span>
                <span className="font-medium">
                  {selectedOutlet.Distributor_ID}
                </span>
              </div>
            )}
            {selectedOutlet?.constraint_flag != null && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Constraint</span>
                <span className="font-medium">
                  {selectedOutlet.constraint_flag ? "Yes" : "No"}
                </span>
              </div>
            )}
            {selectedOutlet?.volume_cv != null && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Volume CV</span>
                <span className="font-medium">
                  {selectedOutlet.volume_cv.toFixed(3)}
                </span>
              </div>
            )}
            {selectedOutlet?.rd_demand_pressure != null && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">RD pressure</span>
                <span className="font-medium">
                  {selectedOutlet.rd_demand_pressure.toFixed(2)}
                </span>
              </div>
            )}
            {selectedOutlet?.Trade_Spend_LKR ? (
              <div className="mt-2 flex justify-between border-t pt-2 text-xs">
                <span className="text-muted-foreground">Promo spend</span>
                <span className="font-medium text-green-600">
                  LKR {fmt(selectedOutlet.Trade_Spend_LKR)}
                </span>
              </div>
            ) : null}
            {selectedOutlet && (
              <div className="mt-3 border-t pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 w-full gap-2 text-xs"
                  disabled={isGeneratingInsight}
                  onClick={handleGenerateInsight}
                >
                  {isGeneratingInsight ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  {selectedInsight
                    ? "Insight generated"
                    : isGeneratingInsight
                      ? "Generating insight"
                      : "Generate insight"}
                </Button>
              </div>
            )}
            {selectedInsight && (
              <div className="mt-3 space-y-3 rounded-md border bg-muted/30 p-3 text-xs">
                <p className="leading-relaxed">{selectedInsight.verdict}</p>
                <div>
                  <p className="mb-1 font-semibold text-green-600">
                    Growth drivers
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    {selectedInsight.positiveDrivers.slice(0, 3).map((driver) => (
                      <li key={driver}>{driver}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 font-semibold text-amber-700">
                    Recommended action
                  </p>
                  <p className="leading-relaxed text-muted-foreground">
                    {selectedInsight.recommendedAction}
                  </p>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
    </Popover>
  )
}
