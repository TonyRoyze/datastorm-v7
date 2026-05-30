import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function CardSkeleton() {
  return (
    <div className="flex-1 min-w-[180px] rounded-xl border bg-gradient-to-t from-primary/5 to-card shadow-xs p-4 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

export default function OverviewLoading() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-row flex-wrap gap-4 px-4 lg:px-6">
        {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              <Skeleton className="h-4 w-40" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-3 w-full max-w-xl" />
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              <Skeleton className="h-4 w-32" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-3 w-48" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
