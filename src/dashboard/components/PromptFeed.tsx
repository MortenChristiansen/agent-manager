import type { PromptEntry } from "../../shared/types";

interface Props {
  prompts: PromptEntry[];
}

export function PromptFeed({ prompts }: Props) {
  if (prompts.length === 0) {
    return (
      <div className="text-xs text-gray-600 text-center py-4">
        No recent prompts
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {prompts.slice(0, 20).map((entry, i) => (
        <div key={`${entry.timestamp}-${i}`} className="text-xs">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-gray-600 font-mono">
              {formatTime(entry.timestamp)}
            </span>
            <span className="text-gray-400 font-medium">{entry.project}</span>
          </div>
          <p className="text-gray-500 truncate pl-4">"{entry.text}"</p>
        </div>
      ))}
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
