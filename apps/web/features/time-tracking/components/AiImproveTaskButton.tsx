import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { runAndPollAiJob } from "@/features/scrum-management/api/ai-insight.service";

interface AiImproveTaskButtonProps {
  text: string;
  onImprove: (improvedText: string) => void;
  userId: string;
  disabled?: boolean;
}

export function AiImproveTaskButton({
  text,
  onImprove,
  userId,
  disabled = false,
}: AiImproveTaskButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleImprove = async () => {
    if (!text.trim() || !userId) return;
    setLoading(true);
    try {
      const result = await runAndPollAiJob("IMPROVE_DESCRIPTION", "user", userId, { text });
      if (result?.recommendation) {
        onImprove(result.recommendation);
      }
    } catch (error) {
      console.error("AI description improvement failed", error);
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = disabled || loading || !text.trim();

  return (
    <button
      type="button"
      onClick={handleImprove}
      disabled={isButtonDisabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-[#c3c6d2] px-2.5 py-1 text-xs font-semibold shadow-sm transition-all duration-200 
        ${
          isButtonDisabled
            ? "cursor-not-allowed bg-gray-50 text-brand-muted opacity-60"
            : "bg-gradient-to-r from-brand/5 to-brand-cyan/5 text-brand hover:border-brand hover:from-brand/10 hover:to-brand-cyan/10"
        }`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {loading ? "Improving..." : "Improve with AI"}
    </button>
  );
}
