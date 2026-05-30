import fs from "fs";
import path from "path";
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

const DATA_DIR = path.join(process.cwd(), "public", "data");

function readJSON(filename: string): any[] {
  const p = path.join(DATA_DIR, filename);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")) : [];
}

const fmt = (v: number) =>
  v.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtMoney = (v: number) =>
  "LKR " + v.toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function BudgetPage() {
  const budget = readJSON("budget_allocations.json").sort(
    (a: any, b: any) => b.Trade_Spend_LKR - a.Trade_Spend_LKR
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
            {fmt(budget.length)} outlets ·{" "}
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
                    {fmtMoney(Math.round(b.Trade_Spend_LKR))}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {((b.Trade_Spend_LKR / totalBudget) * 100).toFixed(2)}%
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
