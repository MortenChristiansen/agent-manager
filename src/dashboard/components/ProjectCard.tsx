import type { ProjectWithState } from "../../shared/types";
import { TabStatus } from "./TabStatus";

interface Props {
  project: ProjectWithState;
  onActivate: (name: string) => void;
  onDeactivate: (name: string) => void;
}

export function ProjectCard({ project, onActivate, onDeactivate }: Props) {
  const { name, config, state, tabs } = project;
  const isActive = state.status === "active";

  return (
    <div className="group relative rounded-lg border border-gray-800 bg-gray-900/50 p-3 hover:border-gray-700 transition-colors">
      {/* Color accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: config.color }}
      />

      <div className="pl-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-gray-100">{name}</h3>
            {isActive && state.gitBranch && (
              <span className="text-xs text-gray-500 font-mono">
                {state.gitBranch}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isActive && state.gitStatusSummary && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  state.gitStatusSummary === "clean"
                    ? "text-emerald-400 bg-emerald-400/10"
                    : "text-amber-400 bg-amber-400/10"
                }`}
              >
                {state.gitStatusSummary}
              </span>
            )}
            {isActive ? (
              <button
                onClick={() => onDeactivate(name)}
                className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-red-400 transition-colors"
                title="Deactivate"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="3" width="10" height="10" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => onActivate(name)}
                className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-emerald-400 transition-colors"
                title="Activate"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <polygon points="4,2 14,8 4,14" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tab status (active only) */}
        {isActive && config.terminal.tabs.length > 0 && (
          <div className="mb-1.5">
            <TabStatus configuredTabs={config.terminal.tabs} liveTabs={tabs} />
          </div>
        )}

        {/* State description */}
        {state.stateDescription && (
          <p className="text-xs text-gray-500 italic truncate">
            "{state.stateDescription}"
          </p>
        )}
      </div>
    </div>
  );
}
