import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function MapLoading() {
  return (
    <div className="flex flex-col gap-2 p-4 lg:p-6">
      <CardTitle className="px-1 text-base font-medium">
        <Skeleton className="h-4 w-44" />
      </CardTitle>
      <div className="relative flex-1 overflow-hidden rounded-lg border">
        <Skeleton className="size-full min-h-125" />
      </div>
    </div>
  )
}
