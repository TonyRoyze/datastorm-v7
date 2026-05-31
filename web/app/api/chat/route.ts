import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import fs from "fs";
import path from "path";

// ─── Local data loader (cached in module scope, only read once per server lifetime) ───
const DATA_DIR = path.join(process.cwd(), "public", "data");

let _budgetCache: any[] | null = null;
let _predsCache: any[] | null = null;

function loadBudget(): any[] {
  if (_budgetCache) return _budgetCache;
  const p = path.join(DATA_DIR, "budget_allocations.json");
  if (!fs.existsSync(p)) return [];
  _budgetCache = JSON.parse(fs.readFileSync(p, "utf-8"));
  return _budgetCache!;
}

function loadPredictions(): any[] {
  if (_predsCache) return _predsCache;
  const p = path.join(DATA_DIR, "predictions.json");
  if (!fs.existsSync(p)) return [];
  _predsCache = JSON.parse(fs.readFileSync(p, "utf-8"));
  return _predsCache!;
}

// ─── Smart Query Router ───────────────────────────────────────────────────────
// Analyzes the question and builds a relevant, minimal data context on the server.
// This means each Groq call stays small (fast + rate-limit safe) regardless of question.
function buildSmartContext(question: string, pageContext: any): object {
  const q = question.toLowerCase();
  const budget = loadBudget();
  const preds = loadPredictions();

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  // ── Distributor questions ──
  if (q.match(/distributor|dist_w|dist_c|dist_nw|dist_s/)) {
    const byDist: Record<string, any> = {};
    budget.forEach((b: any) => {
      const d = b.Distributor_ID || "Unknown";
      if (!byDist[d]) byDist[d] = { outlets: 0, totalSpend: 0, totalVolume: 0, totalIncremental: 0 };
      byDist[d].outlets++;
      byDist[d].totalSpend += b.Trade_Spend_LKR ?? 0;
      byDist[d].totalVolume += b.Maximum_Monthly_Liters ?? 0;
      byDist[d].totalIncremental += b.incremental_volume ?? 0;
    });
    return {
      question,
      queryType: "distributor_breakdown",
      distributors: Object.entries(byDist).map(([id, s]: any) => ({
        distributorId: id,
        outlets: s.outlets,
        totalSpendLKR: Math.round(s.totalSpend),
        avgSpendPerOutletLKR: Math.round(s.totalSpend / s.outlets),
        totalPredictedVolumeLmo: Math.round(s.totalVolume),
        totalIncrementalVolumeLmo: Math.round(s.totalIncremental),
      })).sort((a, b) => b.totalSpendLKR - a.totalSpendLKR),
    };
  }

  // ── Outlet type questions ──
  if (q.match(/grocery|eatery|hotel|pharmacy|smmt|kade|outlet type|type of outlet/)) {
    const byType: Record<string, any> = {};
    budget.forEach((b: any) => {
      const t = b.Outlet_Type || "Unknown";
      if (!byType[t]) byType[t] = { count: 0, totalSpend: 0, totalVolume: 0, totalIncremental: 0 };
      byType[t].count++;
      byType[t].totalSpend += b.Trade_Spend_LKR ?? 0;
      byType[t].totalVolume += b.Maximum_Monthly_Liters ?? 0;
      byType[t].totalIncremental += b.incremental_volume ?? 0;
    });
    return {
      question,
      queryType: "outlet_type_breakdown",
      outletTypes: Object.entries(byType).map(([type, s]: any) => ({
        type,
        count: s.count,
        totalSpendLKR: Math.round(s.totalSpend),
        avgSpendLKR: Math.round(s.totalSpend / s.count),
        avgPredictedVolumeLmo: Math.round(s.totalVolume / s.count),
        totalIncrementalLmo: Math.round(s.totalIncremental),
      })).sort((a, b) => b.totalSpendLKR - a.totalSpendLKR),
    };
  }

  // ── Outlet size questions ──
  if (q.match(/size|small|medium|large|extra large/)) {
    const bySize: Record<string, any> = {};
    budget.forEach((b: any) => {
      const s = b.Outlet_Size || "Unknown";
      if (!bySize[s]) bySize[s] = { count: 0, totalSpend: 0, totalVolume: 0 };
      bySize[s].count++;
      bySize[s].totalSpend += b.Trade_Spend_LKR ?? 0;
      bySize[s].totalVolume += b.Maximum_Monthly_Liters ?? 0;
    });
    return {
      question,
      queryType: "outlet_size_breakdown",
      outletSizes: Object.entries(bySize).map(([size, s]: any) => ({
        size,
        count: s.count,
        avgSpendLKR: Math.round(s.totalSpend / s.count),
        avgVolumeLmo: Math.round(s.totalVolume / s.count),
        totalSpendLKR: Math.round(s.totalSpend),
      })).sort((a, b) => b.avgVolumeLmo - a.avgVolumeLmo),
    };
  }

  // ── Worst / lowest / poor performing outlets ──
  if (q.match(/worst|lowest|poor|least|bottom|underperform|low potential/)) {
    const sorted = [...budget].sort((a: any, b: any) =>
      a.Maximum_Monthly_Liters - b.Maximum_Monthly_Liters
    );
    return {
      question,
      queryType: "worst_outlets_by_potential",
      note: "These 15 outlets have the lowest predicted sales potential.",
      worstOutlets: sorted.slice(0, 15).map((b: any) => ({
        outletId: b.Outlet_ID,
        type: b.Outlet_Type,
        size: b.Outlet_Size,
        distributor: b.Distributor_ID,
        predictedVolumeLmo: Math.round(b.Maximum_Monthly_Liters),
        historicalMax: Math.round(b.historical_max_volume),
        constraintFlag: b.constraint_flag,
        tradeSpendLKR: Math.round(b.Trade_Spend_LKR),
      })),
    };
  }

  // ── Best / top / highest performing outlets ──
  if (q.match(/best|top|highest|most|biggest|leading|rank/)) {
    const sorted = [...budget].sort((a: any, b: any) =>
      b.Maximum_Monthly_Liters - a.Maximum_Monthly_Liters
    );
    return {
      question,
      queryType: "top_outlets_by_potential",
      note: "These 15 outlets have the highest predicted sales potential.",
      topOutlets: sorted.slice(0, 15).map((b: any) => ({
        outletId: b.Outlet_ID,
        type: b.Outlet_Type,
        size: b.Outlet_Size,
        distributor: b.Distributor_ID,
        predictedVolumeLmo: Math.round(b.Maximum_Monthly_Liters),
        incrementalVolumeLmo: Math.round(b.incremental_volume),
        tradeSpendLKR: Math.round(b.Trade_Spend_LKR),
        spendType: b.Spend_Type,
      })),
    };
  }

  // ── Incremental / untapped / opportunity questions ──
  if (q.match(/incremental|untapped|opportunity|headroom|growth|potential/)) {
    const sorted = [...budget].sort((a: any, b: any) =>
      b.incremental_volume - a.incremental_volume
    );
    return {
      question,
      queryType: "top_incremental_opportunities",
      note: "These outlets have the largest gap between historical performance and predicted potential.",
      topOpportunities: sorted.slice(0, 15).map((b: any) => ({
        outletId: b.Outlet_ID,
        type: b.Outlet_Type,
        distributor: b.Distributor_ID,
        historicalMaxLmo: Math.round(b.historical_max_volume),
        predictedMaxLmo: Math.round(b.Maximum_Monthly_Liters),
        incrementalLmo: Math.round(b.incremental_volume),
        historicalVsPredictedPct: `${Math.min((b.historical_max_volume / (b.Maximum_Monthly_Liters || 1)) * 100, 100).toFixed(1)}%`,
      })),
    };
  }

  // ── Spend type / budget allocation strategy ──
  if (q.match(/spend type|promotional|discount|merchandising|strategy|allocation/)) {
    const bySpend: Record<string, any> = {};
    budget.forEach((b: any) => {
      const s = b.Spend_Type || "unknown";
      if (!bySpend[s]) bySpend[s] = { count: 0, totalSpend: 0 };
      bySpend[s].count++;
      bySpend[s].totalSpend += b.Trade_Spend_LKR ?? 0;
    });
    return {
      question,
      queryType: "spend_type_breakdown",
      totalBudgetLKR: Math.round(budget.reduce((s: number, b: any) => s + b.Trade_Spend_LKR, 0)),
      spendTypes: Object.entries(bySpend).map(([type, s]: any) => ({
        spendType: type,
        outlets: s.count,
        totalSpendLKR: Math.round(s.totalSpend),
        percentageOfBudget: `${((s.totalSpend / budget.reduce((t: number, b: any) => t + b.Trade_Spend_LKR, 0)) * 100).toFixed(1)}%`,
      })),
    };
  }

  // ── Constrained / supply-limited outlets ──
  if (q.match(/constrain|supply|limit|cap|bottleneck/)) {
    const constrained = budget.filter((b: any) => b.constraint_flag === 1);
    return {
      question,
      queryType: "constrained_outlets",
      totalConstrained: constrained.length,
      percentageConstrained: `${((constrained.length / budget.length) * 100).toFixed(1)}%`,
      note: "Constrained outlets (constraint_flag=1) are supply or capacity limited and cannot fully reach predicted potential.",
      examples: constrained.slice(0, 10).map((b: any) => ({
        outletId: b.Outlet_ID,
        type: b.Outlet_Type,
        size: b.Outlet_Size,
        distributor: b.Distributor_ID,
        predictedVolumeLmo: Math.round(b.Maximum_Monthly_Liters),
        historicalMax: Math.round(b.historical_max_volume),
      })),
    };
  }

  // ── Cooler / cold chain questions ──
  if (q.match(/cooler|cold chain|refrigerat/)) {
    const byCooler: Record<number, any> = {};
    budget.forEach((b: any) => {
      const c = b.Cooler_Count ?? 0;
      if (!byCooler[c]) byCooler[c] = { count: 0, totalVolume: 0, totalSpend: 0 };
      byCooler[c].count++;
      byCooler[c].totalVolume += b.Maximum_Monthly_Liters ?? 0;
      byCooler[c].totalSpend += b.Trade_Spend_LKR ?? 0;
    });
    return {
      question,
      queryType: "cooler_count_breakdown",
      coolerBreakdown: Object.entries(byCooler).map(([coolers, s]: any) => ({
        coolerCount: Number(coolers),
        outlets: s.count,
        avgVolumeLmo: Math.round(s.totalVolume / s.count),
        avgSpendLKR: Math.round(s.totalSpend / s.count),
      })).sort((a, b) => b.coolerCount - a.coolerCount),
    };
  }

  // ── Prediction / volume for a specific outlet ──
  const outletMatch = q.match(/out_\d+/);
  if (outletMatch) {
    const id = outletMatch[0].toUpperCase();
    const budgetRow = budget.find((b: any) => b.Outlet_ID === id);
    const predRow = preds.find((p: any) => p.Outlet_ID === id);
    if (budgetRow || predRow) {
      return {
        question,
        queryType: "specific_outlet_lookup",
        outlet: {
          outletId: id,
          type: budgetRow?.Outlet_Type,
          size: budgetRow?.Outlet_Size,
          distributor: budgetRow?.Distributor_ID,
          coolerCount: budgetRow?.Cooler_Count,
          constraintFlag: budgetRow?.constraint_flag,
          volumeCV: budgetRow?.volume_cv,
          historicalMaxLmo: Math.round(budgetRow?.historical_max_volume ?? 0),
          predictedMaxLmo: Math.round(budgetRow?.Maximum_Monthly_Liters ?? predRow?.Maximum_Monthly_Liters ?? 0),
          incrementalLmo: Math.round(budgetRow?.incremental_volume ?? 0),
          tradeSpendLKR: Math.round(budgetRow?.Trade_Spend_LKR ?? 0),
          spendType: budgetRow?.Spend_Type,
        },
      };
    }
  }

  // ── Summary / overview / how many / total ──
  if (q.match(/how many|total|summary|overview|overall|count|number of/)) {
    const totalBudget = budget.reduce((s: number, b: any) => s + b.Trade_Spend_LKR, 0);
    const totalVolume = budget.reduce((s: number, b: any) => s + b.Maximum_Monthly_Liters, 0);
    const totalIncremental = budget.reduce((s: number, b: any) => s + b.incremental_volume, 0);
    return {
      question,
      queryType: "summary_statistics",
      summary: {
        totalOutletsInDataset: preds.length,
        westernProvinceOutlets: budget.length,
        totalBudgetLKR: Math.round(totalBudget),
        budgetCapLKR: 5_000_000,
        utilizationPct: `${((totalBudget / 5_000_000) * 100).toFixed(1)}%`,
        totalPredictedVolumeLmo: Math.round(totalVolume),
        totalIncrementalOpportunityLmo: Math.round(totalIncremental),
        avgPredictedVolumePerOutletLmo: Math.round(totalVolume / budget.length),
        constrainedOutlets: budget.filter((b: any) => b.constraint_flag === 1).length,
      },
    };
  }

  // ── Default: return the rich static context from the page ──
  return { question, queryType: "general", pageContext };
}

// ─── Main Route Handler ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let prompt: string = "";
  let context: any = {};
  let isInitialInsight: boolean = false;

  try {
    const body = await req.json();
    prompt = body.prompt || "";
    context = body.context || {};
    isInitialInsight = body.isInitialInsight || false;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is missing from environment variables." },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    // For initial insights, use the page context as-is
    if (isInitialInsight) {
      const systemPrompt = `You are an expert Data Analyst generating a quick Executive Summary.
You are given aggregated statistics from a dataset.
Write a 2-3 sentence business summary highlighting the key takeaways (e.g. total volume, budget utilization, key regions). Do not explain what you are doing.`;
      const userMessage = `Generate insights based on the following context:\n${JSON.stringify(context, null, 2)}`;

      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.4,
      });
      const text = completion.choices[0]?.message?.content || "No response generated.";
      return NextResponse.json({ result: text });
    }

    // For chatbot questions: build smart context from live data
    const smartContext = buildSmartContext(prompt, context);

    const systemPrompt = `You are a business Data Analyst for DataStorm, a Sri Lankan beverage company analytics platform.
You are given a specific, pre-queried slice of data that is directly relevant to the user's question.
Answer concisely and professionally in 2-4 sentences. Use the exact numbers from the data provided.
Do NOT make up data. If the answer isn't in the data, say so honestly.`;

    const userMessage = `Data context:\n${JSON.stringify(smartContext, null, 2)}\n\nUser question: ${prompt}`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 300,
    });

    const text = completion.choices[0]?.message?.content || "No response generated.";
    return NextResponse.json({ result: text });

  } catch (error: any) {
    console.error("AI Route Error:", error);

    // ── Offline fallback: local data queries, no AI needed ──
    if (!isInitialInsight && prompt) {
      try {
        const smartContext: any = buildSmartContext(prompt, context);
        const qt = smartContext.queryType;

        if (qt === "distributor_breakdown" && smartContext.distributors) {
          const top = smartContext.distributors[0];
          return NextResponse.json({ result: `[Offline Mode] Top distributor by spend is ${top.distributorId} with LKR ${top.totalSpendLKR.toLocaleString()} across ${top.outlets} outlets and ${top.totalPredictedVolumeLmo.toLocaleString()} L/mo predicted volume.` });
        }
        if (qt === "outlet_type_breakdown" && smartContext.outletTypes) {
          const top = smartContext.outletTypes[0];
          return NextResponse.json({ result: `[Offline Mode] ${top.type} outlets receive the most budget: LKR ${top.totalSpendLKR.toLocaleString()} across ${top.count} outlets with avg ${top.avgPredictedVolumeLmo.toLocaleString()} L/mo volume.` });
        }
        if (qt === "worst_outlets_by_potential" && smartContext.worstOutlets) {
          const w = smartContext.worstOutlets[0];
          return NextResponse.json({ result: `[Offline Mode] The lowest potential outlet is ${w.outletId} (${w.type}, ${w.size}) with only ${w.predictedVolumeLmo.toLocaleString()} L/mo predicted.` });
        }
        if (qt === "top_outlets_by_potential" && smartContext.topOutlets) {
          const t = smartContext.topOutlets[0];
          return NextResponse.json({ result: `[Offline Mode] Top outlet by potential is ${t.outletId} (${t.type}) with ${t.predictedVolumeLmo.toLocaleString()} L/mo and LKR ${t.tradeSpendLKR.toLocaleString()} spend.` });
        }
        if (qt === "summary_statistics" && smartContext.summary) {
          const s = smartContext.summary;
          return NextResponse.json({ result: `[Offline Mode] ${s.westernProvinceOutlets} outlets are allocated from a LKR ${s.totalBudgetLKR.toLocaleString()} budget (${s.utilizationPct} utilized). Total addressable volume is ${s.totalPredictedVolumeLmo.toLocaleString()} L/mo.` });
        }
        if (qt === "specific_outlet_lookup" && smartContext.outlet) {
          const o = smartContext.outlet;
          return NextResponse.json({ result: `[Offline Mode] ${o.outletId} is a ${o.size} ${o.type} under ${o.distributor} with ${o.predictedMaxLmo.toLocaleString()} L/mo potential and LKR ${o.tradeSpendLKR.toLocaleString()} trade spend.` });
        }
      } catch (e) { /* ignore fallback errors */ }
    }

    if (isInitialInsight && context?.metrics) {
      const m = context.metrics;
      return NextResponse.json({ result: `Operating across ${m.totalOutlets?.toLocaleString()} outlets, with ${m.westernProvinceOutlets?.toLocaleString()} (${m.westernProvinceShare}) in the Western Province. Total addressable volume is ${m.totalAddressableVolume?.toLocaleString()} L/mo with ${m.budgetUtilizationPercentage}% of the LKR 5M budget utilized.` });
    }

    return NextResponse.json({ result: "I'm in offline mode. Ask about distributors, outlet types, top/worst outlets, budget allocation, or a specific outlet like OUT_02962." });
  }
}
