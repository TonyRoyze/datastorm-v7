"use client";

import { SidebarTrigger } from "@/components/ui/sidebar"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { usePageContext, AiMode } from "@/components/page-context"

export function SiteHeader() {
  const { aiMode, setAiMode } = usePageContext();

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
        </div>
        <div className="flex items-center">
          <ToggleGroup type="single" value={aiMode} onValueChange={(v) => v && setAiMode(v as AiMode)} className="bg-muted rounded-md p-1">
            <ToggleGroupItem value="groq-online" aria-label="AI Mode" className="text-xs px-3 py-1 h-auto data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm">
              AI Mode
            </ToggleGroupItem>
            <ToggleGroupItem value="gemini-offline" aria-label="Offline Mode" className="text-xs px-3 py-1 h-auto data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm">
              Offline Mode
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </header>
  )
}
