import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function BudgetLoading() {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            <Skeleton className="h-4 w-36" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-3 w-48" />
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
