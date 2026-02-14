import type { PromptEntry } from "../../shared/types";

interface Props {
  prompts: PromptEntry[];
  currentProject?: string;
}

export function PromptFeed({ prompts, currentProject }: Props) {
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

  return (
    <div className="space-y-2">
      {filtered.slice(0, 20).map((entry, i) => (
        <div key={`${entry.timestamp}-${i}`} className="text-xs flex items-baseline gap-2">
          <span className="text-gray-600 font-mono shrink-0">
            {formatTime(entry.timestamp)}
          </span>
          <p className="text-gray-500 truncate">"{entry.text}"</p>
        </div>
      ))}
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
