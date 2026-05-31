import { promises as fs } from "fs";
import path from "path";
import { cache } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtMoney, fmtNumber } from "@/lib/utils";

const DATA_DIR = path.join(process.cwd(), "public", "data");

const readJSON = cache(async (filename: string): Promise<any[]> => {
  const p = path.join(DATA_DIR, filename);
  try {
    const data = await fs.readFile(p, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
});

export default async function BudgetPage() {
  const data = await readJSON("budget_allocations.json");
  const budget = data.sort(
    (a: any, b: any) => (b.Trade_Spend_LKR ?? 0) - (a.Trade_Spend_LKR ?? 0)
  );

  const totalBudget = budget.reduce(
    (s: number, b: any) => s + (b.Trade_Spend_LKR ?? 0),
    0
  );

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Budget Allocation
          </CardTitle>
          <CardDescription>
            {fmtNumber(budget.length)} outlets ·{" "}
            {fmtMoney(Math.round(totalBudget))} total
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Outlet</TableHead>
                <TableHead className="text-right">
                  Trade Spend (LKR)
                </TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budget.map((b: any) => (
                <TableRow key={b.Outlet_ID}>
                  <TableCell className="font-mono text-xs">
                    {b.Outlet_ID}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {fmtMoney(Math.round(b.Trade_Spend_LKR ?? 0))}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {totalBudget > 0
                      ? (((b.Trade_Spend_LKR ?? 0) / totalBudget) * 100).toFixed(2)
                      : "0.00"}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
