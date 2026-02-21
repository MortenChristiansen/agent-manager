import { useState, useRef, useEffect } from "react";
import type { ProjectWithState } from "../../shared/types";

interface Props {
  project: ProjectWithState;
  isCurrent?: boolean;
  onActivate: (name: string) => void;
  onDeactivate: (name: string) => void;
  onSwitch?: (name: string) => void;
  onEdit?: (name: string) => void;
  onUpdateStatus?: (name: string, status: string) => void;
}

export function ProjectCard({ project, isCurrent, onActivate, onDeactivate, onSwitch, onEdit, onUpdateStatus }: Props) {
  const { name, config, state, claudeTabs } = project;
  const isActive = state.status === "active";
  const isActivating = state.status === "activating";
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusDraft, setStatusDraft] = useState(state.stateDescription || "");
  const statusInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingStatus && statusInputRef.current) {
      statusInputRef.current.focus();
      statusInputRef.current.select();
    }
  }, [editingStatus]);

  const saveStatus = () => {
    const trimmed = statusDraft.trim();
    if (onUpdateStatus && trimmed !== (state.stateDescription || "")) {
      onUpdateStatus(name, trimmed);
    }
    setEditingStatus(false);
  };

  const cancelStatusEdit = () => {
    setStatusDraft(state.stateDescription || "");
    setEditingStatus(false);
  };

  const handleCardClick = () => {
    if (isActive && !isCurrent && onSwitch) {
      onSwitch(name);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-lg border bg-gray-900/50 p-3 transition-colors ${
        isCurrent
          ? "border-opacity-80"
          : isActive && onSwitch
            ? "border-gray-800 hover:border-gray-600 cursor-pointer"
            : "border-gray-800 hover:border-gray-700"
      }`}
      style={
        isCurrent
          ? { borderColor: config.color }
          : undefined
      }
    >
      {/* Color accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: config.color }}
      />

      <div className="pl-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-semibold text-sm text-gray-100 truncate">{name}</h3>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(name); }}
                className="p-1 rounded hover:bg-gray-800 text-gray-600 hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
                title="Edit project"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" />
                </svg>
              </button>
            )}
            {state.gitStatusSummary && (
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
            {isActivating ? (
              <svg className="w-4 h-4 animate-spin text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="8" cy="8" r="6" strokeOpacity="0.25" />
                <path d="M8 2a6 6 0 0 1 6 6" strokeLinecap="round" />
              </svg>
            ) : isActive ? (
              <button
                onClick={(e) => { e.stopPropagation(); onDeactivate(name); }}
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

        {/* Activating indicator */}
        {isActivating && (
          <p className="text-xs text-gray-400 mb-1.5 animate-pulse">
            Setting up environment…
          </p>
        )}

        {/* Active Claude tabs */}
        {claudeTabs.length > 0 && (
          <div className="mb-1.5 space-y-0.5">
            {claudeTabs.map((title, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-400 animate-pulse" />
                <span className="text-amber-400 truncate">{title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Git branch */}
        {state.gitBranch && (
          <p className="text-xs text-gray-500 font-mono truncate mb-0.5">
            {state.gitBranch}
          </p>
        )}

        {/* State description — click to edit */}
        {editingStatus ? (
          <input
            ref={statusInputRef}
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.target.value)}
            onBlur={saveStatus}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveStatus();
              if (e.key === "Escape") cancelStatusEdit();
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-gray-300 italic w-full bg-transparent border-b border-gray-600 outline-none py-0.5 placeholder-gray-700"
            placeholder="Where you left off…"
          />
        ) : state.stateDescription ? (
          <p
            onClick={(e) => { e.stopPropagation(); setStatusDraft(state.stateDescription); setEditingStatus(true); }}
            className="text-xs text-gray-500 italic truncate cursor-text hover:text-gray-400 transition-colors"
            title="Click to edit status"
          >
            {state.stateDescription}
          </p>
        ) : (
          <p
            onClick={(e) => { e.stopPropagation(); setStatusDraft(""); setEditingStatus(true); }}
            className="text-xs text-gray-700 italic truncate cursor-text hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100"
          >
            Set status…
          </p>
        )}
      </div>
    </div>
  );
}
