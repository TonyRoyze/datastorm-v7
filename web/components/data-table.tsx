"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Columns3,
  Filter,
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
  discount:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  merchandising:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  promotional:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

const fmtMoney = (v: number) =>
  "LKR " + v.toLocaleString(undefined, { maximumFractionDigits: 0 })

function SortHeader({
  column,
  label,
  align = "left",
}: {
  column: Column<any>
  label: string
  align?: "left" | "right"
}) {
  const sorted = column.getIsSorted()
  return (
    <button
      onClick={() => column.toggleSorting(sorted === "asc")}
      className={`inline-flex items-center gap-1 text-xs font-medium hover:text-foreground ${align === "right" ? "w-full justify-end" : ""}`}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="size-3" />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3" />
      ) : (
        <ArrowUpDown className="size-3 opacity-30" />
      )}
    </button>
  )
}

function InputFilter({ column }: { column: Column<any> }) {
  const [value, setValue] = React.useState("")
  React.useEffect(() => {
    const id = setTimeout(() => column.setFilterValue(value || undefined), 200)
    return () => clearTimeout(id)
  }, [value, column])
  return (
    <Input
      placeholder="Filter..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="mt-1 h-7 text-xs"
    />
  )
}

function SelectFilter({
  column,
  options,
  placeholder = "All",
}: {
  column: Column<any>
  options: string[]
  placeholder?: string
}) {
  const filterValue = column.getFilterValue() as string | undefined
  const value = filterValue ?? "__all__"
  return (
    <Select
      value={value}
      onValueChange={(v) =>
        column.setFilterValue(v === "__all__" ? undefined : v)
      }
    >
      <SelectTrigger className="mt-1 h-7 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="__all__">All</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function RangeFilter({
  column,
  min,
  max,
  step,
}: {
  column: Column<any>
  min: number
  max: number
  step?: number
}) {
  const [lo, setLo] = React.useState("")
  const [hi, setHi] = React.useState("")
  React.useEffect(() => {
    const current = column.getFilterValue() as [number, number] | undefined
    setLo(current?.[0] !== undefined ? String(current[0]) : "")
    setHi(current?.[1] !== undefined ? String(current[1]) : "")
  }, [column])
  React.useEffect(() => {
    const id = setTimeout(() => {
      const loNum = lo === "" ? -Infinity : Number(lo)
      const hiNum = hi === "" ? Infinity : Number(hi)
      column.setFilterValue(lo !== "" || hi !== "" ? [loNum, hiNum] : undefined)
    }, 200)
    return () => clearTimeout(id)
  }, [lo, hi, column])
  return (
    <div className="mt-1 flex items-center gap-1">
      <Input
        type="number"
        placeholder={String(min)}
        value={lo}
        onChange={(e) => setLo(e.target.value)}
        min={min}
        max={max}
        step={step}
        className="h-7 w-17 text-[10px]"
      />
      <span className="text-[10px] text-muted-foreground">–</span>
      <Input
        type="number"
        placeholder={String(max)}
        value={hi}
        onChange={(e) => setHi(e.target.value)}
        min={min}
        max={max}
        step={step}
        className="h-7 w-17 text-[10px]"
      />
    </div>
  )
}
function SpendTypeBadge({ type }: { type: string }) {
  return (
    <Badge
      variant="outline"
      className={`text-[10px] tracking-wider uppercase ${typeColor[type] ?? ""}`}
    >
      {type}
    </Badge>
  )
}

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
    if (cached) return
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
      const fallback: InsightResult = {
        verdict: `${row.Outlet_ID} is a ${row.Outlet_Size ?? ""} ${row.Outlet_Type ?? "outlet"} with a predicted potential of ${row.Maximum_Monthly_Liters?.toLocaleString() ?? "N/A"} L/mo.`,
        positiveDrivers: [
          "Large outlet size supports high volume",
          `${row.Cooler_Count ?? 0} coolers installed`,
        ],
        negativeConstraints: [
          row.constraint_flag === 1
            ? "Supply constraint active"
            : "No constraints detected",
        ],
        recommendedAction: `Apply ${row.Spend_Type} spend of ${fmtMoney(Math.round(row.Trade_Spend_LKR))}.`,
      }
      setCache((prev) => new Map(prev).set(row.Outlet_ID, fallback))
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpen = (open: boolean) => {
    setIsOpen(open)
    if (open && !cached) generateInsight()
  }

  const insight = cached

  return (
    <div className="flex justify-end">
      <Dialog open={isOpen} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 border border-blue-200 bg-blue-50/50 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
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
            <div className="flex flex-wrap gap-2 pt-1">
              {row.Outlet_Type && (
                <Badge variant="secondary" className="text-xs">
                  {row.Outlet_Type}
                </Badge>
              )}
              {row.Outlet_Size && (
                <Badge variant="secondary" className="text-xs">
                  {row.Outlet_Size}
                </Badge>
              )}
              {row.Distributor_ID && (
                <Badge variant="outline" className="font-mono text-xs">
                  {row.Distributor_ID}
                </Badge>
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
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Predicted</p>
                  <p className="text-sm font-bold">
                    {row.Maximum_Monthly_Liters?.toLocaleString() ?? "—"} L
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Incremental</p>
                  <p className="text-sm font-bold text-green-600">
                    +{row.incremental_volume?.toLocaleString() ?? "—"} L
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Trade Spend</p>
                  <p className="text-sm font-bold">
                    {fmtMoney(Math.round(row.Trade_Spend_LKR))}
                  </p>
                </div>
              </div>
              <div className="rounded-md border-l-4 border-blue-500 bg-blue-50/70 p-3 text-sm leading-relaxed text-foreground dark:bg-blue-950/30">
                {insight.verdict}
              </div>
              <div className="space-y-1.5">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-500">
                  <TrendingUp className="size-4" /> Growth Drivers
                </h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {insight.positiveDrivers.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-1.5">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-500">
                  <TrendingDown className="size-4" /> Local Constraints
                </h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {insight.negativeConstraints.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  <Lightbulb className="size-4" /> Recommended Action
                </h4>
                <p className="text-sm leading-relaxed text-foreground">
                  {insight.recommendedAction}
                </p>
              </div>
              {cached && (
                <p className="text-right text-[10px] text-muted-foreground">
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
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      Cooler_Count: false,
      volume_cv: false,
      historical_max_volume: false,
      constraint_flag: false,
      incremental_volume: false,
    })
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [insightCache, setInsightCache] = React.useState<
    Map<string, InsightResult>
  >(new Map())

  const columns: ColumnDef<OutletRow>[] = React.useMemo(
    () => [
      {
        accessorKey: "Outlet_ID",
        header: ({ column }) => <SortHeader column={column} label="Outlet" />,
        cell: ({ row }) => (
          <div>
            <span className="font-mono text-xs">{row.original.Outlet_ID}</span>
            {row.original.Outlet_Type && (
              <p className="text-[10px] text-muted-foreground">
                {row.original.Outlet_Type}
              </p>
            )}
          </div>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "Distributor_ID",
        header: ({ column }) => (
          <SortHeader column={column} label="Distributor" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.Distributor_ID ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "Outlet_Size",
        header: ({ column }) => <SortHeader column={column} label="Size" />,
        cell: ({ row }) => (
          <span className="text-xs capitalize">
            {row.original.Outlet_Size?.toLowerCase() ?? "—"}
          </span>
        ),
        filterFn: "equals",
      },
      {
        accessorKey: "Cooler_Count",
        header: ({ column }) => <SortHeader column={column} label="Coolers" />,
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">
            {row.original.Cooler_Count ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "Maximum_Monthly_Liters",
        header: ({ column }) => (
          <SortHeader column={column} label="Predicted (L)" align="right" />
        ),
        cell: ({ row }) => (
          <div className="text-right text-xs font-medium tabular-nums">
            {row.original.Maximum_Monthly_Liters?.toLocaleString() ?? "—"}
          </div>
        ),
      },
      {
        accessorKey: "incremental_volume",
        header: ({ column }) => (
          <SortHeader column={column} label="Incremental (L)" align="right" />
        ),
        cell: ({ row }) => (
          <div className="text-right text-xs text-green-600 tabular-nums">
            {row.original.incremental_volume != null
              ? `+${row.original.incremental_volume.toLocaleString()}`
              : "—"}
          </div>
        ),
      },
      {
        accessorKey: "volume_cv",
        header: ({ column }) => (
          <SortHeader column={column} label="CV" align="right" />
        ),
        cell: ({ row }) => (
          <div className="text-right text-xs text-muted-foreground tabular-nums">
            {row.original.volume_cv != null
              ? row.original.volume_cv.toFixed(2)
              : "—"}
          </div>
        ),
      },
      {
        accessorKey: "historical_max_volume",
        header: ({ column }) => (
          <SortHeader
            column={column}
            label="Max Historical (L)"
            align="right"
          />
        ),
        cell: ({ row }) => (
          <div className="text-right text-xs tabular-nums">
            {row.original.historical_max_volume?.toLocaleString() ?? "—"}
          </div>
        ),
      },
      {
        accessorKey: "constraint_flag",
        header: ({ column }) => (
          <SortHeader column={column} label="Constrained" />
        ),
        cell: ({ row }) =>
          row.original.constraint_flag === 1 ? (
            <Badge variant="destructive" className="text-[10px]">
              Yes
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">No</span>
          ),
        filterFn: "equals",
      },
      {
        accessorKey: "Spend_Type",
        header: ({ column }) => <SortHeader column={column} label="Type" />,
        cell: ({ row }) => <SpendTypeBadge type={row.original.Spend_Type} />,
        filterFn: "equals",
      },
      {
        accessorKey: "Trade_Spend_LKR",
        header: ({ column }) => (
          <SortHeader column={column} label="Trade Spend (LKR)" align="right" />
        ),
        cell: ({ row }) => (
          <div className="text-right font-medium tabular-nums">
            {fmtMoney(Math.round(row.original.Trade_Spend_LKR))}
          </div>
        ),
      },
      {
        id: "share",
        header: ({ column }) => (
          <SortHeader column={column} label="Share" align="right" />
        ),
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
        enableSorting: false,
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
        enableSorting: false,
      },
    ],
    [insightCache]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, pagination },
    getRowId: (row) => row.Outlet_ID,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const totalBudget = data.reduce((s, b) => s + b.Trade_Spend_LKR, 0)
  const columnLabels: Record<string, string> = {
    Outlet_ID: "Outlet",
    Distributor_ID: "Distributor",
    Outlet_Size: "Size",
    Cooler_Count: "Coolers",
    Maximum_Monthly_Liters: "Predicted (L)",
    incremental_volume: "Incremental (L)",
    volume_cv: "CV",
    historical_max_volume: "Max Historical (L)",
    constraint_flag: "Constrained",
    Spend_Type: "Type",
    Trade_Spend_LKR: "Trade Spend",
    share: "Share",
    ai_insight: "AI Insight",
  }

  const filterComponents: Record<
    string,
    (column: Column<any>) => React.ReactNode
  > = {
    Outlet_ID: (col) => <InputFilter column={col} />,
    Distributor_ID: (col) => <InputFilter column={col} />,
    Cooler_Count: (col) => <RangeFilter column={col} min={0} max={100} />,
    Maximum_Monthly_Liters: (col) => (
      <RangeFilter column={col} min={0} max={50000} step={100} />
    ),
    incremental_volume: (col) => (
      <RangeFilter column={col} min={0} max={10000} step={50} />
    ),
    volume_cv: (col) => <RangeFilter column={col} min={0} max={5} step={0.1} />,
    historical_max_volume: (col) => (
      <RangeFilter column={col} min={0} max={50000} step={100} />
    ),
    Outlet_Size: (col) => (
      <SelectFilter column={col} options={["Small", "Medium", "Large"]} />
    ),
    constraint_flag: (col) => (
      <SelectFilter column={col} options={["0", "1"]} placeholder="All" />
    ),
    Spend_Type: (col) => (
      <SelectFilter
        column={col}
        options={["discount", "merchandising", "promotional"]}
      />
    ),
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="text-sm text-muted-foreground">
          {fmtMoney(Math.round(totalBudget))} total
        </div>
        <div className="flex items-center gap-3">
          {insightCache.size > 0 && (
            <div className="text-xs text-muted-foreground">
              {insightCache.size} insight{insightCache.size !== 1 ? "s" : ""}{" "}
              cached
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                <Columns3 className="size-3" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(v)}
                  >
                    {columnLabels[col.id] ?? col.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    <div className="flex items-center justify-between gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {header.column.getCanFilter() &&
                        filterComponents[header.column.id] && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                className={`size-4 p-0 opacity-30 transition-opacity hover:opacity-100 ${header.column.getFilterValue() ? "text-blue-500 opacity-100" : ""}`}
                              >
                                <Filter className="size-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
                              sideOffset={4}
                              className="w-56 p-3"
                            >
                              {filterComponents[header.column.id](
                                header.column
                              )}
                            </PopoverContent>
                          </Popover>
                        )}
                    </div>
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
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-4">
        <div className="hidden flex-1 text-sm text-muted-foreground lg:flex" />
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
            </label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {[10, 20, 30, 40, 50].map((ps) => (
                    <SelectItem key={ps} value={`${ps}`}>
                      {ps}
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
