import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function MapLoading() {
  return (
    <div className="flex flex-col gap-2 p-4 lg:p-6">
      <CardTitle className="text-base font-medium px-1">
        <Skeleton className="h-4 w-44" />
      </CardTitle>
      <div className="relative flex-1 rounded-lg border overflow-hidden">
        <Skeleton className="size-full min-h-[500px]" />
      </div>
    </div>
  )
}
