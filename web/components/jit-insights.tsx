"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";

export function JitInsights({ contextData }: { contextData: any }) {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsight = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: contextData,
          isInitialInsight: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInsight(data.result);
      } else {
        setError(data.error || "Failed to generate insight.");
      }
    } catch (err) {
      setError("Network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            AI Executive Summary
          </span>
          {!insight && !isLoading && (
            <button
              onClick={generateInsight}
              className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
            >
              Generate AI Report
            </button>
          )}
        </CardTitle>
        <CardDescription>
          On-demand business insights generated from the current data view.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            Analyzing data...
          </div>
        ) : insight ? (
          <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {insight}
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : (
          <div className="text-sm text-muted-foreground italic">
            Click "Generate AI Report" to get a quick summary.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
