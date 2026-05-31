"use client"

import * as React from "react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react"

export function CoordinateOffset({
  latOff = 0.02,
  lngOff = 0.02,
  onLatChange,
  onLngChange,
}: {
  latOff?: number
  lngOff?: number
  onLatChange?: (v: number) => void
  onLngChange?: (v: number) => void
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-xs">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">
            Δlat {latOff >= 0 ? "+" : ""}{latOff.toFixed(4)} · Δlng {lngOff >= 0 ? "+" : ""}{lngOff.toFixed(4)}
          </span>
        </span>
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </button>
      {open && (
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Latitude offset (N)</span>
              <span className="font-mono font-medium text-foreground">
                {latOff >= 0 ? "+" : ""}{latOff.toFixed(4)}°
              </span>
            </div>
            <Slider
              value={[latOff]}
              onValueChange={([v]) => onLatChange?.(v)}
              min={-0.1}
              max={0.1}
              step={0.001}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>-0.1</span>
              <span>0</span>
              <span>+0.1</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Longitude offset (E)</span>
              <span className="font-mono font-medium text-foreground">
                {lngOff >= 0 ? "+" : ""}{lngOff.toFixed(4)}°
              </span>
            </div>
            <Slider
              value={[lngOff]}
              onValueChange={([v]) => onLngChange?.(v)}
              min={-0.1}
              max={0.1}
              step={0.001}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>-0.1</span>
              <span>0</span>
              <span>+0.1</span>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-xs font-mono">
            <span>python3 shift_coords.py --dlat {latOff} --dlng {lngOff}</span>
            <Button variant="ghost" size="icon" className="size-6" onClick={() => { onLatChange?.(0.02); onLngChange?.(0.02) }}>
              <RotateCcw className="size-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
