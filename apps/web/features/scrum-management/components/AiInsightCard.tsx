"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";
import { SectionCard } from "@/components/shared/SectionCard";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { triggerSupervisorAdvisory, getAiJob, getAiResult } from "../api/ai-insight.service";

export function AiInsightCard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);

  const trigger = useMutation({
    mutationFn: () => triggerSupervisorAdvisory(userId),
    onSuccess: (res) => setJobId(res.jobId),
  });

  const { data: job } = useQuery({
    queryKey: ["ai-job", jobId],
    queryFn: () => getAiJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "SUCCEEDED" || status === "FAILED" ? false : 2000;
    },
  });

  const { data: result } = useQuery({
    queryKey: ["ai-result", jobId],
    queryFn: () => getAiResult(jobId!),
    enabled: !!jobId && job?.status === "SUCCEEDED",
  });

  const isWorking = job ? job.status === "QUEUED" || job.status === "RUNNING" : trigger.isPending;

  return (
    <SectionCard title="AI Insights">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        Team Health Advisory
      </div>

      {!jobId ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-brand-muted">
            Generate a real AI advisory over your team&apos;s recent timesheets and scrum blockers.
          </p>
          <Button
            type="button"
            onClick={() => {
              queryClient.removeQueries({ queryKey: ["ai-job"] });
              trigger.mutate();
            }}
            disabled={trigger.isPending}
            className="w-fit"
          >
            {trigger.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
            Generate Insight
          </Button>
          {trigger.isError ? (
            <p className="text-sm text-red-600">
              {trigger.error instanceof ApiError ? trigger.error.message : "Couldn't start the AI job."}
            </p>
          ) : null}
        </div>
      ) : isWorking ? (
        <div className="flex items-center gap-2 text-sm text-brand-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Analyzing team activity…
        </div>
      ) : job?.status === "FAILED" ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-red-600">Insight generation failed{job.errorMsg ? `: ${job.errorMsg}` : "."}</p>
          <Button type="button" size="sm" onClick={() => { setJobId(null); }} className="w-fit">
            Try Again
          </Button>
        </div>
      ) : result ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-brand-navy">{result.summary}</p>
          <div className="border-t border-brand-navy/10 pt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-brand">Recommendation</p>
            <p className="mt-1 text-sm text-brand-navy">{result.recommendation}</p>
          </div>
          <p className="text-xs text-brand-muted">Confidence: {Math.round(result.confidence * 100)}%</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-brand-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading result…
        </div>
      )}
    </SectionCard>
  );
}
