"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { SectionCard } from "@/components/shared/SectionCard";
import { runAndPollAiJob } from "@/features/scrum-management/api/ai-insight.service";

type RecapKind = "DAILY_SUMMARY" | "WEEKLY_SUMMARY";

interface AiRecapCardProps {
  userId: string;
}

/**
 * Wires the DAILY_SUMMARY and WEEKLY_SUMMARY AI features (built worker
 * handlers that previously had no UI trigger anywhere). Daily = a scrum-style
 * recap of the last 7 days of standups; Weekly = timesheet + scrum roll-up.
 */
export function AiRecapCard({ userId }: AiRecapCardProps) {
  const [running, setRunning] = useState<RecapKind | null>(null);
  const [result, setResult] = useState<{ kind: RecapKind; summary: string; recommendation: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: RecapKind) => {
    if (!userId) return;
    setRunning(kind);
    setError(null);
    try {
      const res = await runAndPollAiJob(kind, "user", userId);
      setResult({ kind, summary: res.summary, recommendation: res.recommendation });
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI recap failed.");
    } finally {
      setRunning(null);
    }
  };

  const btn = (kind: RecapKind, label: string) => (
    <button
      type="button"
      onClick={() => run(kind)}
      disabled={running !== null}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#c3c6d2] bg-gradient-to-r from-brand/5 to-brand-cyan/5 px-3 py-1.5 text-xs font-semibold text-brand shadow-sm transition-all hover:border-brand hover:from-brand/10 hover:to-brand-cyan/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {running === kind ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      {running === kind ? "Generating..." : label}
    </button>
  );

  return (
    <SectionCard
      title="✨ AI Work Recap"
      action={
        <div className="flex items-center gap-2">
          {btn("DAILY_SUMMARY", "Scrum Recap (7 days)")}
          {btn("WEEKLY_SUMMARY", "Weekly Summary")}
        </div>
      }
    >
      {error ? (
        <p className="rounded-[8px] bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      ) : result ? (
        <div className="space-y-2.5 text-sm text-brand-ink">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-muted">
            {result.kind === "DAILY_SUMMARY" ? "Scrum recap — last 7 days" : "Weekly summary"}
          </p>
          <p className="whitespace-pre-wrap rounded-[12px] border border-[#c3c6d2]/40 bg-[#f6f3f4]/40 p-3.5 leading-relaxed">
            {result.summary}
          </p>
          {result.recommendation ? (
            <p className="whitespace-pre-wrap rounded-[12px] border border-brand/20 bg-brand-cyan/5 p-3.5 leading-relaxed">
              {result.recommendation}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="py-4 text-center text-xs text-brand-muted">
          Generate an AI recap of your recent standups or a weekly work summary.
        </div>
      )}
    </SectionCard>
  );
}
