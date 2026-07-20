import { useState } from "react";
import { Target, Loader2, Sparkles } from "lucide-react";
import { SectionCard } from "@/components/shared/SectionCard";
import { runAndPollAiJob } from "@/features/scrum-management/api/ai-insight.service";

interface AiGoalCopilotCardProps {
  userId: string;
}

export function AiGoalCopilotCard({ userId }: AiGoalCopilotCardProps) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string | null>(null);

  const handleFetchRecommendations = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await runAndPollAiJob("KPI_COPILOT", "user", userId);
      if (result?.recommendation) {
        setRecommendations(result.recommendation);
      }
    } catch (error) {
      console.error("AI KPI Copilot analysis failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard
      title="🎯 AI KPI Goal Copilot"
      action={
        <button
          type="button"
          onClick={handleFetchRecommendations}
          disabled={loading}
          className="flex h-8 items-center gap-1.5 rounded-[8px] bg-brand px-3 text-xs font-bold text-white hover:bg-[#1467d6] disabled:opacity-60 transition-colors"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Analyzing..." : "Get AI Advice"}
        </button>
      }
    >
      {recommendations ? (
        <div className="space-y-2.5 text-sm text-brand-ink whitespace-pre-wrap">
          <p className="font-semibold text-brand-navy">Weekly Action Checklist:</p>
          <div className="p-3.5 rounded-[12px] border border-brand/20 bg-brand-cyan/5 text-brand-ink leading-relaxed">
            {recommendations}
          </div>
        </div>
      ) : (
        <div className="py-4 text-center text-xs text-brand-muted">
          Click the button above to receive a personalized checklist for hitting your targets.
        </div>
      )}
    </SectionCard>
  );
}
