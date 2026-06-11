import { DataTable } from "@/components/data-table"
import { PageContextSetter } from "@/components/page-context-setter"
import { SectionCards, type CardData } from "@/components/section-cards"
import { getDashboardData } from "@/lib/dashboard-data"
import { fmtMoney, fmtNumber } from "@/lib/utils"

export default async function AllocationsPage() {
  const { tableData, pageContextData, metrics } = await getDashboardData()

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <PageContextSetter
        data={{
          ...pageContextData,
          pageName: "Budget Allocation Details",
        }}
      />

      <div className="px-4 lg:px-6">
        <div className="rounded-lg border bg-card p-5 shadow-xs">
          <p className="text-sm font-medium text-muted-foreground">
            Allocation details
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">
            KPI cards and outlet-level budget table
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            This page keeps the original dashboard metrics and the full
            searchable outlet table for detailed budget review, filtering, and
            AI outlet insight generation.
          </p>
        </div>
      </div>

      <SectionCards
        cards={
          [
            {
              label: "Western Province",
              value: fmtNumber(metrics.westernProvinceOutlets),
              sub: `${metrics.westernProvinceShare.toFixed(1)}% of total`,
            },
            {
              label: "Avg Predicted Volume",
              value: `${fmtNumber(metrics.avgVolume)} L/mo`,
            },
            {
              label: "Total Addressable Volume",
              value: `${fmtNumber(metrics.totalVolume)} L/mo`,
            },
            {
              label: "Budget Allocations",
              value: `${fmtNumber(metrics.totalFundedOutlets)} outlets`,
              extra: `${fmtMoney(metrics.totalBudget)} total`,
            },
          ] satisfies CardData[]
        }
      />

      <div className="px-4 lg:px-6">
        <DataTable data={tableData} />
      </div>
    </div>
  )
}
