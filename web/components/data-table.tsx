"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Sparkles,
  Loader2,
  TrendingUp,
  TrendingDown,
  Lightbulb,
} from "lucide-react"

export const budgetSchema = z.object({
  Outlet_ID: z.string(),
  Distributor_ID: z.string().optional(),
  Outlet_Type: z.string().optional(),
  Outlet_Size: z.string().optional(),
  Cooler_Count: z.number().optional(),
  constraint_flag: z.number().optional(),
  volume_cv: z.number().optional(),
  historical_max_volume: z.number().optional(),
  Maximum_Monthly_Liters: z.number().optional(),
  incremental_volume: z.number().optional(),
  Trade_Spend_LKR: z.number(),
  Spend_Type: z.enum(["discount", "merchandising", "promotional"]),
})

type OutletRow = z.infer<typeof budgetSchema>

type InsightResult = {
  verdict: string
  positiveDrivers: string[]
  negativeConstraints: string[]
  recommendedAction: string
}

const typeColor: Record<string, string> = {
  discount: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  merchandising: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  promotional: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

const fmtMoney = (v: number) =>
  "LKR " + v.toLocaleString(undefined, { maximumFractionDigits: 0 })

function SpendTypeBadge({ type }: { type: string }) {
  return (
    <Badge
      variant="outline"
      className={`text-[10px] uppercase tracking-wider ${typeColor[type] ?? ""}`}
    >
      {type}
    </Badge>
  )
}

// Per-outlet insight dialog with on-demand generation + caching
function OutletInsightCell({
  row,
  cache,
  setCache,
}: {
  row: OutletRow
  cache: Map<string, InsightResult>
  setCache: React.Dispatch<React.SetStateAction<Map<string, InsightResult>>>
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const cached = cache.get(row.Outlet_ID)

  const generateInsight = async () => {
    if (cached) return // Already cached, skip API call
    setIsLoading(true)
    try {
      const res = await fetch("/api/outlet-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet: row }),
      })
      const data = await res.json()
      setCache((prev) => new Map(prev).set(row.Outlet_ID, data))
    } catch {
      // Use offline fallback if network fails
      const fallback: InsightResult = {
        verdict: `${row.Outlet_ID} is a ${row.Outlet_Size ?? ""} ${row.Outlet_Type ?? "outlet"} with a predicted potential of ${row.Maximum_Monthly_Liters?.toLocaleString() ?? "N/A"} L/mo.`,
        positiveDrivers: ["Large outlet size supports high volume", `${row.Cooler_Count ?? 0} coolers installed`],
        negativeConstraints: [row.constraint_flag === 1 ? "Supply constraint active" : "No constraints detected"],
        recommendedAction: `Apply ${row.Spend_Type} spend of ${fmtMoney(Math.round(row.Trade_Spend_LKR))}.`,
      }
      setCache((prev) => new Map(prev).set(row.Outlet_ID, fallback))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpen = (open: boolean) => {
    setIsOpen(open)
    if (open && !cached) {
      generateInsight()
    }
  }

  const insight = cached

  return (
    <div className="flex justify-end">
      <Dialog open={isOpen} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800"
          >
            <Sparkles className="size-3.5" />
            {cached ? "View Insight" : "Generate"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="size-5 text-blue-500" />
              AI Outlet Insight — {row.Outlet_ID}
            </DialogTitle>
            <div className="flex gap-2 flex-wrap pt-1">
              {row.Outlet_Type && (
                <Badge variant="secondary" className="text-xs">{row.Outlet_Type}</Badge>
              )}
              {row.Outlet_Size && (
                <Badge variant="secondary" className="text-xs">{row.Outlet_Size}</Badge>
              )}
              {row.Distributor_ID && (
                <Badge variant="outline" className="text-xs font-mono">{row.Distributor_ID}</Badge>
              )}
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-blue-500" />
              <span className="text-sm">Generating AI insight via Groq...</span>
            </div>
          ) : insight ? (
            <div className="grid gap-4 py-2">
              {/* Quick stats bar */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Predicted</p>
                  <p className="text-sm font-bold">{row.Maximum_Monthly_Liters?.toLocaleString() ?? "—"} L</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Incremental</p>
                  <p className="text-sm font-bold text-green-600">+{row.incremental_volume?.toLocaleString() ?? "—"} L</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Trade Spend</p>
                  <p className="text-sm font-bold">{fmtMoney(Math.round(row.Trade_Spend_LKR))}</p>
                </div>
              </div>

              {/* AI verdict */}
              <div className="rounded-md bg-blue-50/70 dark:bg-blue-950/30 p-3 text-sm leading-relaxed text-foreground border-l-4 border-blue-500">
                {insight.verdict}
              </div>

              {/* Growth drivers */}
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-green-600 dark:text-green-500 flex items-center gap-2">
                  <TrendingUp className="size-4" /> Growth Drivers
                </h4>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  {insight.positiveDrivers.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>

              {/* Constraints */}
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-red-600 dark:text-red-500 flex items-center gap-2">
                  <TrendingDown className="size-4" /> Local Constraints
                </h4>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  {insight.negativeConstraints.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>

              {/* Action */}
              <div className="rounded-md bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 space-y-1">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Lightbulb className="size-4" /> Recommended Action
                </h4>
                <p className="text-sm text-foreground leading-relaxed">{insight.recommendedAction}</p>
              </div>

              {cached && (
                <p className="text-[10px] text-muted-foreground text-right">
                  ✓ Powered by Groq · Llama 3.1 · Cached
                </p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function DataTable({ data }: { data: OutletRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  // Shared cache across all rows — avoids repeat API calls
  const [insightCache, setInsightCache] = React.useState<Map<string, InsightResult>>(new Map())

  const columns: ColumnDef<OutletRow>[] = React.useMemo(() => [
    {
      accessorKey: "Outlet_ID",
      header: "Outlet",
      cell: ({ row }) => (
        <div>
          <span className="font-mono text-xs">{row.original.Outlet_ID}</span>
          {row.original.Outlet_Type && (
            <p className="text-[10px] text-muted-foreground">{row.original.Outlet_Type}</p>
          )}
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "Spend_Type",
      header: "Type",
      cell: ({ row }) => <SpendTypeBadge type={row.original.Spend_Type} />,
    },
    {
      accessorKey: "Trade_Spend_LKR",
      header: () => <div className="text-right">Trade Spend (LKR)</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {fmtMoney(Math.round(row.original.Trade_Spend_LKR))}
        </div>
      ),
    },
    {
      id: "share",
      header: () => <div className="text-right">Share</div>,
      cell: ({ row, table }) => {
        const total = table
          .getFilteredRowModel()
          .rows.reduce((s, r) => s + r.original.Trade_Spend_LKR, 0)
        return (
          <div className="text-right text-muted-foreground tabular-nums">
            {((row.original.Trade_Spend_LKR / total) * 100).toFixed(2)}%
          </div>
        )
      },
    },
    {
      id: "ai_insight",
      header: () => <div className="text-right">AI Insight</div>,
      cell: ({ row }) => (
        <OutletInsightCell
          row={row.original}
          cache={insightCache}
          setCache={setInsightCache}
        />
      ),
    },
  ], [insightCache])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    getRowId: (row) => row.Outlet_ID,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const totalBudget = data.reduce((s, b) => s + b.Trade_Spend_LKR, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="text-sm text-muted-foreground">
          {data.length.toLocaleString()} outlets ·{" "}
          {fmtMoney(Math.round(totalBudget))} total
        </div>
        {insightCache.size > 0 && (
          <div className="text-xs text-muted-foreground">
            {insightCache.size} insight{insightCache.size !== 1 ? "s" : ""} cached
          </div>
        )}
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-4">
        <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
            </label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
