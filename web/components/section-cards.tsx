import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

export type CardData = {
  label: string
  value: string
  sub?: string
  extra?: string
}

export function SectionCards({
  cards,
}: {
  cards: CardData[]
}) {
  return (
    <div className="flex flex-row flex-wrap gap-4 px-4 lg:px-6 
                      *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs *:data-[slot=card]:flex-1 *:data-[slot=card]:min-w-[180px]
                      dark:*:data-[slot=card]:bg-card">
      {cards.map((card) => (
        <Card key={card.label} className="@container/card">
          <CardHeader>
            <CardDescription>{card.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {card.value}
            </CardTitle>
            {card.sub && (
              <CardAction>
                <Badge variant="outline">
                  <TrendingUp className="size-3" />
                  {card.sub}
                </Badge>
              </CardAction>
            )}
          </CardHeader>
          {card.extra && (
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">{card.extra}</div>
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  )
}
