import { useState } from "react";
import { Sparkles, Loader2, Award } from "lucide-react";
import { SectionCard } from "@/components/shared/SectionCard";
import { runAndPollAiJob } from "@/features/scrum-management/api/ai-insight.service";

interface AiInternAdvisoryCardProps {
  userId: string;
}

export function AiInternAdvisoryCard({ userId }: AiInternAdvisoryCardProps) {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);

  const handleFetchAdvice = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const result = await runAndPollAiJob("INTERN_ADVISORY", "user", userId);
      if (result?.recommendation) {
        setAdvice(result.recommendation);
      }
    } catch (error) {
      console.error("AI Intern advisory check failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard
      title="🎓 AI Intern Mentor"
      action={
        <button
          type="button"
          onClick={handleFetchAdvice}
          disabled={loading}
          className="flex h-8 items-center gap-1.5 rounded-[8px] bg-[#0284c7] px-3 text-xs font-bold text-white hover:bg-[#0369a1] disabled:opacity-60 transition-colors"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Composing..." : "Get Mentoring"}
        </button>
      }
    >
      {advice ? (
        <div className="space-y-2.5 text-sm text-brand-ink whitespace-pre-wrap">
          <div className="flex items-center gap-2 text-sky-700 font-bold">
            <Award className="h-4 w-4" />
            <span>Mentor Feedback:</span>
          </div>
          <div className="p-3.5 rounded-[12px] border border-sky-200 bg-sky-50/40 text-brand-ink leading-relaxed">
            {advice}
          </div>
        </div>
      ) : (
        <div className="py-4 text-center text-xs text-brand-muted">
          Click the button above to receive customized learning suggestions and soft-skills mentorship advice.
        </div>
      )}
    </SectionCard>
  );
}
