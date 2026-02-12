import type { TabStatus as TabStatusType, TerminalTab } from "../../shared/types";

interface Props {
  configuredTabs: TerminalTab[];
  liveTabs: TabStatusType[];
}

const stateColors: Record<string, string> = {
  processing: "text-amber-400",
  idle: "text-emerald-400",
  inactive: "text-gray-500",
};

const stateDots: Record<string, string> = {
  processing: "bg-amber-400 animate-pulse",
  idle: "bg-emerald-400",
  inactive: "bg-gray-600",
};

export function TabStatus({ configuredTabs, liveTabs }: Props) {
  const tabMap = new Map(liveTabs.map((t) => [t.tabName, t]));

  return (
    <div className="space-y-1">
      {configuredTabs.map((tab) => {
        const live = tabMap.get(tab.name);
        const state = live?.state ?? "inactive";
        const elapsed = live?.lastActivity ? getElapsed(live.lastActivity) : "";

        return (
          <div key={tab.name} className="flex items-center gap-2 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stateDots[state]}`} />
            <span className="text-gray-400 w-14 shrink-0">{tab.name}</span>
            <span className={`truncate ${stateColors[state]}`}>
              {state === "processing" && live?.lastPrompt
                ? live.lastPrompt
                : state === "processing"
                  ? "processing"
                  : tab.command || "shell"}
            </span>
            {elapsed && state === "processing" && (
              <span className="text-gray-600 shrink-0 ml-auto">({elapsed})</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getElapsed(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "<1m";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h${mins % 60}m`;
}
