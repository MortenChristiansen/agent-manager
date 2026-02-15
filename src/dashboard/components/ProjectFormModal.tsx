import { useState } from "react";
import type { ProjectWithState } from "../../shared/types";

interface Props {
  mode: "add" | "edit";
  project?: ProjectWithState;
  onSubmit: (data: ProjectFormData) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export interface ProjectFormData {
  name: string;
  path: string;
  color: string;
  description: string;
  terminal: {
    profile?: string;
    tabs: { name: string; command: string }[];
  };
  controlProtocol?: number;
}

const PRESET_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

function randomColor() {
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
}

export function ProjectFormModal({ mode, project, onSubmit, onDelete, onCancel }: Props) {
  const isEdit = mode === "edit";
  const cfg = project?.config;

  const [path, setPath] = useState(cfg?.path ?? "");
  const [name, setName] = useState(project?.name ?? "");
  const [nameManual, setNameManual] = useState(isEdit);
  const [color, setColor] = useState(cfg?.color ?? randomColor());
  const [description, setDescription] = useState(cfg?.description ?? "");
  const [terminalProfile, setTerminalProfile] = useState(cfg?.terminal?.profile ?? "");
  const [tabs, setTabs] = useState<{ name: string; command: string }[]>(
    cfg?.terminal?.tabs?.map((t) => ({ name: t.name, command: t.command ?? "" })) ?? []
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handlePathChange = (val: string) => {
    setPath(val);
    if (!nameManual) {
      setName(val.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "");
    }
  };

  const handleNameChange = (val: string) => {
    setNameManual(true);
    setName(val);
  };

  const addTab = () => {
    setTabs([...tabs, { name: "", command: "" }]);
  };

  const removeTab = (i: number) => {
    setTabs(tabs.filter((_, idx) => idx !== i));
  };

  const updateTab = (i: number, field: "name" | "command", val: string) => {
    const next = [...tabs];
    next[i] = { ...next[i], [field]: val };
    setTabs(next);
  };

  const handleSubmit = () => {
    if (!isEdit && !path.trim()) {
      setError("Path is required");
      return;
    }
    // filter out tabs with no name
    const validTabs = tabs.filter((t) => t.name.trim());
    setError("");
    setSubmitting(true);
    onSubmit({
      name: name || path.split("/").pop() || "",
      path: path.trim(),
      color,
      description,
      terminal: {
        profile: terminalProfile.trim() || undefined,
        tabs: validTabs,
      },
      controlProtocol: undefined,
    });
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete?.();
  };

  const isDormant = project?.state.status === "dormant";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm max-h-[90vh] flex flex-col">
        <div className="p-4 pb-0 shrink-0">
          <h3 className="text-sm font-semibold">{isEdit ? "Edit Project" : "Add Project"}</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-3 space-y-3">
          {error && (
            <div className="p-2 rounded bg-red-400/10 border border-red-400/20">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Path */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Path</label>
            {isEdit ? (
              <p className="text-sm text-gray-300 font-mono bg-gray-800 rounded-lg p-2 truncate">{path}</p>
            ) : (
              <input
                type="text"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-gray-500"
                value={path}
                onChange={(e) => handlePathChange(e.target.value)}
                placeholder="/home/user/projects/my-app"
                autoFocus
              />
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            {isEdit ? (
              <p className="text-sm text-gray-300 font-mono bg-gray-800 rounded-lg p-2">{name}</p>
            ) : (
              <input
                type="text"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-gray-500"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Derived from path"
              />
            )}
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Color</label>
            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    color === c ? "border-white scale-110" : "border-transparent hover:border-gray-500"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                className="w-6 h-6 rounded border border-gray-700 bg-transparent cursor-pointer ml-1"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                title="Custom color"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-gray-500"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
            />
          </div>

          {/* Terminal Profile */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Terminal Profile</label>
            <input
              type="text"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-gray-500"
              value={terminalProfile}
              onChange={(e) => setTerminalProfile(e.target.value)}
              placeholder="Default"
            />
          </div>

          {/* Terminal Tabs */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-400">Terminal Tabs</label>
              <button
                onClick={addTab}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                + Add tab
              </button>
            </div>
            {tabs.length === 0 ? (
              <p className="text-xs text-gray-600 italic">No tabs configured</p>
            ) : (
              <div className="space-y-1.5">
                {tabs.map((tab, i) => (
                  <div key={i} className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-gray-500"
                      value={tab.name}
                      onChange={(e) => updateTab(i, "name", e.target.value)}
                      placeholder="Tab name"
                    />
                    <input
                      type="text"
                      className="flex-[2] min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-gray-500"
                      value={tab.command}
                      onChange={(e) => updateTab(i, "command", e.target.value)}
                      placeholder="Command (empty = claude)"
                    />
                    <button
                      onClick={() => removeTab(i)}
                      className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-800 text-gray-600 hover:text-red-400 transition-colors text-sm"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>


        </div>

        {/* Footer */}
        <div className="p-4 pt-0 shrink-0 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || (!isEdit && !path.trim())}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 transition-colors disabled:opacity-50"
            >
              {submitting ? (isEdit ? "Saving..." : "Adding...") : isEdit ? "Save" : "Add"}
            </button>
          </div>

          {isEdit && onDelete && isDormant && (
            <button
              onClick={handleDelete}
              className={`w-full px-3 py-1.5 text-xs rounded-lg transition-colors ${
                confirmDelete
                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-400"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-500 hover:text-red-400"
              }`}
            >
              {confirmDelete ? "Confirm delete" : "Delete project"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
