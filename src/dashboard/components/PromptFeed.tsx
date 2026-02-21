import { useState, useRef, useEffect, useCallback } from "react";
import type { PromptEntry } from "../../shared/types";

interface Props {
  prompts: PromptEntry[];
  currentProject?: string;
}

function PromptTooltip({ text, anchor }: { text: string; anchor: DOMRect | null }) {
  if (!anchor) return null;

  return (
    <div
      className="fixed z-50 max-w-72 px-3 py-2 text-xs text-gray-200 bg-gray-800 border border-gray-700 rounded-lg shadow-xl"
      style={{
        left: anchor.left,
        bottom: window.innerHeight - anchor.top + 4,
      }}
    >
      <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>
    </div>
  );
}

export function PromptFeed({ prompts, currentProject }: Props) {
  const [tooltip, setTooltip] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

  const copyPrompt = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }, []);

  const filtered = currentProject
    ? prompts.filter((p) => p.project === currentProject)
    : prompts;

  if (filtered.length === 0) {
    return (
      <div className="text-xs text-gray-600 text-center py-4">
        No recent prompts
      </div>
    );
  }

  const showTooltip = (e: React.MouseEvent, text: string) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    hoverTimer.current = setTimeout(() => setTooltip({ text, rect }), 300);
  };

  const hideTooltip = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setTooltip(null);
  };

  return (
    <>
      <div className="space-y-2">
        {filtered.slice(0, 20).map((entry, i) => (
          <div
            key={`${entry.timestamp}-${i}`}
            className="text-xs flex items-center gap-2 cursor-default group"
            onMouseEnter={(e) => showTooltip(e, entry.text)}
            onMouseLeave={hideTooltip}
          >
            <span className="text-gray-600 font-mono shrink-0">
              {formatTime(entry.timestamp)}
            </span>
            <p className="text-gray-500 truncate flex-1 min-w-0">{entry.text}</p>
            <button
              onClick={(e) => { e.stopPropagation(); copyPrompt(entry.text, i); }}
              className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-gray-300 transition-opacity"
              title="Copy prompt"
            >
              {copiedIdx === i ? "✓" : "⎘"}
            </button>
          </div>
        ))}
      </div>
      <PromptTooltip text={tooltip?.text ?? ""} anchor={tooltip?.rect ?? null} />
    </>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
