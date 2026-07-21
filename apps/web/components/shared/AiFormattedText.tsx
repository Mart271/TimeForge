import { Fragment } from "react";

/**
 * Lightweight renderer for AI result text (summary / recommendation). The
 * models return markdown-ish output — "- bullets", "**bold:**" labels, and
 * blank-line-separated paragraphs — which looks like an unstructured wall of
 * text when dumped into a whitespace-pre-wrap block. This turns that into
 * real bullet lists and paragraphs with minimal inline-bold support. No
 * markdown dependency; deliberately tiny and safe (renders text only).
 */
function renderInline(text: string): React.ReactNode {
  // **bold** → <strong>. Split on the delimiter and bold odd segments.
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-brand-navy">{part}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

export function AiFormattedText({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n").map((l) => l.trim());

  // Group consecutive bullet lines into <ul>, everything else into <p>.
  const blocks: { type: "list" | "para"; items: string[] }[] = [];
  for (const line of lines) {
    if (!line) continue;
    const isBullet = /^[-*•]\s+/.test(line);
    const content = isBullet ? line.replace(/^[-*•]\s+/, "") : line;
    const last = blocks[blocks.length - 1];
    if (isBullet) {
      if (last?.type === "list") last.items.push(content);
      else blocks.push({ type: "list", items: [content] });
    } else {
      blocks.push({ type: "para", items: [content] });
    }
  }

  return (
    <div className={className}>
      {blocks.map((block, i) =>
        block.type === "list" ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className={i > 0 ? "mt-2" : undefined}>
            {renderInline(block.items[0])}
          </p>
        ),
      )}
    </div>
  );
}
