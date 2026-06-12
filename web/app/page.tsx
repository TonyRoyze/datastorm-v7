import Link from "next/link"
import type { ReactNode } from "react"
import {
  ArrowRight,
  BadgeDollarSign,
  Banknote,
  CircleAlert,
  MapPin,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react"

import { PageContextSetter } from "@/components/page-context-setter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getDashboardData, type DataRow } from "@/lib/dashboard-data"
import { fmtMoney, fmtNumber } from "@/lib/utils"

const pct = (value: number) => `${value.toFixed(1)}%`

function SummaryStat({
  label,
  value,
  detail,
  icon,
}: {
  label: string
  value: string
  detail: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-lg border bg-background/80 p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
      </div>
      <p className="text-2xl font-semibold tracking-normal tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  )
}

function AllocationBar({
  label,
  value,
  share,
  tone,
}: {
  label: string
  value: string
  share: number
  tone: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium capitalize">{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${Math.max(share, 2)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{pct(share)} of spend</p>
    </div>
  )
}

function OutletHighlight({
  outlet,
  label,
  icon,
  accent,
  metric,
}: {
  outlet: DataRow
  label: string
  icon: ReactNode
  accent: string
  metric: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold">{outlet.Outlet_ID}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {outlet.Outlet_Type ?? "Outlet"} | {outlet.Outlet_Size ?? "Unknown"} |{" "}
            {outlet.Distributor_ID ?? "No distributor"}
          </p>
        </div>
        <div className={`rounded-md p-2 ${accent}`}>{icon}</div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="capitalize">
          {outlet.Spend_Type ?? "planned"}
        </Badge>
        {outlet.constraint_flag === 1 && (
          <Badge variant="destructive">Constrained</Badge>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Trade spend</p>
          <p className="font-semibold tabular-nums">
            {fmtMoney(Math.round(outlet.Trade_Spend_LKR ?? 0))}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-semibold tabular-nums">{metric}</p>
        </div>
      </div>
    </div>
  )
}

export default async function OverviewPage() {
  const {
    pageContextData,
    metrics,
    totalBudgetCap,
    spendTypeSummary,
    outletTypeSummary,
    distributorSummary,
    highlightedOutlets,
  } = await getDashboardData()

  const primarySpendType = spendTypeSummary[0]
  const primaryOutletType = outletTypeSummary[0]
  const primaryDistributor = distributorSummary[0]
  const topSpendOutlet = highlightedOutlets.highestSpend[0]
  const topIncrementalOutlet = highlightedOutlets.incrementalLeaders[0]
  const efficientOutlet = highlightedOutlets.mostEfficient[0]
  const constrainedOutlet = highlightedOutlets.constrainedPriority[0]

  const spendTones = [
    "bg-emerald-500",
    "bg-sky-500",
    "bg-amber-500",
    "bg-rose-500",
  ]

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      <PageContextSetter data={pageContextData} />

      <section className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.18),transparent_32%),linear-gradient(135deg,rgba(14,165,233,0.14),rgba(255,255,255,0))]">
          <div className="grid gap-6 p-5 md:grid-cols-[1.35fr_0.65fr] md:p-7">
            <div className="flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <Badge className="w-fit gap-1.5" variant="secondary">
                  <Sparkles className="size-3.5" />
                  AI budget overview
                </Badge>
                <div className="max-w-3xl space-y-3">
                  <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
                    Budget is concentrated on high-potential outlets with{" "}
                    {primarySpendType?.type ?? "planned"} spend leading the mix.
                  </h1>
                  <p className="text-base leading-7 text-muted-foreground">
                    The current allocation deploys{" "}
                    {fmtMoney(metrics.totalBudget)} across{" "}
                    {fmtNumber(metrics.totalFundedOutlets)} outlets, covering{" "}
                    {pct(metrics.budgetUtilization * 100)} of the available{" "}
                    {fmtMoney(totalBudgetCap)} budget. It is expected to unlock{" "}
                    {fmtNumber(metrics.totalIncrementalVolume)} incremental
                    liters at about{" "}
                    {fmtMoney(Math.round(metrics.costPerIncrementalLiter))} per
                    incremental liter.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/allocations">
                    View allocation table
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/map">
                    Open outlet map
                    <MapPin className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-background/80 p-4 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">
                Allocation focus
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-2xl font-semibold">
                    {primaryOutletType?.type ?? "Outlet"} outlets
                  </p>
                  <p className="text-sm text-muted-foreground">
                    lead outlet-type spend with{" "}
                    {fmtMoney(primaryOutletType?.totalSpendLKR ?? 0)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">
                      Top distributor
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold">
                      {primaryDistributor?.distributor ?? "Unknown"}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">
                      Top-10 spend
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {pct(metrics.top10SpendShare)}
                    </p>
                  </div>
                </div>
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200">
                  {fmtNumber(metrics.constrainedOutlets)} funded outlets are
                  constraint-flagged, holding{" "}
                  {fmtMoney(metrics.constrainedSpend)} of spend.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 px-4 md:grid-cols-2 xl:grid-cols-4 lg:px-6">
        <SummaryStat
          label="Allocated budget"
          value={fmtMoney(metrics.totalBudget)}
          detail={`${pct(metrics.budgetUtilization * 100)} of budget pool`}
          icon={<Banknote className="size-4" />}
        />
        <SummaryStat
          label="Funded outlets"
          value={fmtNumber(metrics.totalFundedOutlets)}
          detail={`${fmtNumber(metrics.totalOutlets)} total outlets analyzed`}
          icon={<Target className="size-4" />}
        />
        <SummaryStat
          label="Incremental volume"
          value={`${fmtNumber(metrics.totalIncrementalVolume)} L`}
          detail={`${fmtMoney(Math.round(metrics.costPerIncrementalLiter))} per incremental L`}
          icon={<TrendingUp className="size-4" />}
        />
        <SummaryStat
          label="Western Province"
          value={fmtNumber(metrics.westernProvinceOutlets)}
          detail={`${pct(metrics.westernProvinceShare)} of mapped outlets`}
          icon={<MapPin className="size-4" />}
        />
      </section>

      <section className="grid gap-6 px-4 xl:grid-cols-[0.95fr_1.05fr] lg:px-6">
        <div className="rounded-lg border bg-card p-5 shadow-xs">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">
                Spend Mix
              </h2>
              <p className="text-sm text-muted-foreground">
                How the budget is split by activation type.
              </p>
            </div>
            <Badge variant="outline">{spendTypeSummary.length} types</Badge>
          </div>
          <div className="space-y-5">
            {spendTypeSummary.map((item, index) => (
              <AllocationBar
                key={item.type}
                label={item.type}
                value={`${fmtMoney(item.spendLKR)} | ${fmtNumber(item.count)} outlets`}
                share={item.spendShare}
                tone={spendTones[index % spendTones.length]}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-xs">
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-normal">
              Where The Money Goes
            </h2>
            <p className="text-sm text-muted-foreground">
              Biggest outlet-type and distributor allocations.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Outlet types
              </p>
              {outletTypeSummary.slice(0, 5).map((item) => (
                <div
                  key={item.type}
                  className="flex items-center justify-between gap-3 rounded-md bg-muted/50 p-3"
                >
                  <div>
                    <p className="font-medium">{item.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtNumber(item.count)} outlets | {pct(item.spendShare)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {fmtMoney(item.totalSpendLKR)}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                Distributors
              </p>
              {distributorSummary.slice(0, 5).map((item) => (
                <div
                  key={item.distributor}
                  className="flex items-center justify-between gap-3 rounded-md bg-muted/50 p-3"
                >
                  <div>
                    <p className="font-mono font-medium">{item.distributor}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtNumber(item.outlets)} outlets | {pct(item.spendShare)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {fmtMoney(item.totalSpendLKR)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 px-4 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-normal">
              Highlighted Outlets
            </h2>
            <p className="text-sm text-muted-foreground">
              A quick read on the outlets that deserve attention before drilling
              into the full table.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/allocations">
              Full outlet list
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {topSpendOutlet && (
            <OutletHighlight
              outlet={topSpendOutlet}
              label="Predicted volume"
              icon={<Trophy className="size-4" />}
              accent="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              metric={`${fmtNumber(
                Math.round(topSpendOutlet.Maximum_Monthly_Liters ?? 0)
              )} L`}
            />
          )}
          {topIncrementalOutlet && (
            <OutletHighlight
              outlet={topIncrementalOutlet}
              label="Incremental volume"
              icon={<TrendingUp className="size-4" />}
              accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              metric={`+${fmtNumber(
                Math.round(topIncrementalOutlet.incremental_volume ?? 0)
              )} L`}
            />
          )}
          {efficientOutlet && (
            <OutletHighlight
              outlet={efficientOutlet}
              label="Efficiency"
              icon={<Zap className="size-4" />}
              accent="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
              metric={`${fmtMoney(
                Math.round(
                  (efficientOutlet.Trade_Spend_LKR ?? 0) /
                    (efficientOutlet.incremental_volume ?? 1)
                )
              )}/L`}
            />
          )}
          {constrainedOutlet && (
            <OutletHighlight
              outlet={constrainedOutlet}
              label="Risk flag"
              icon={<CircleAlert className="size-4" />}
              accent="bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
              metric="Constraint active"
            />
          )}
        </div>
      </section>

      <section className="px-4 lg:px-6">
        <div className="grid gap-4 rounded-lg border bg-card p-5 shadow-xs md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <BadgeDollarSign className="size-5" />
            </div>
            <h2 className="text-xl font-semibold tracking-normal">
              Recommended Focus
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use the allocation table to validate individual outlet decisions,
              but prioritize the budget conversation around concentration,
              constraint risk, and activation-type balance.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md bg-muted/50 p-4">
              <p className="text-sm font-semibold">Protect the leaders</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Top outlets carry {pct(metrics.top10SpendShare)} of spend, so
                monitor execution quality closely.
              </p>
            </div>
            <div className="rounded-md bg-muted/50 p-4">
              <p className="text-sm font-semibold">Resolve constraints</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Constraint-flagged outlets hold{" "}
                {pct(metrics.constrainedSpendShare)} of the allocation.
              </p>
            </div>
            <div className="rounded-md bg-muted/50 p-4">
              <p className="text-sm font-semibold">Tune spend mix</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {primarySpendType?.type ?? "The leading spend type"} receives
                the largest share at {pct(primarySpendType?.spendShare ?? 0)}.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
