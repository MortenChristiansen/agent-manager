import { useState } from "react";
import type { ProjectWithState } from "../../shared/types";

interface Props {
  project: ProjectWithState;
  onConfirm: (stateDescription: string) => void;
  onCancel: () => void;
}

export function DeactivationModal({ project, onConfirm, onCancel }: Props) {
  const [description, setDescription] = useState(
    project.state.stateDescription
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm p-4">
        <h3 className="text-sm font-semibold mb-3">
          Deactivate {project.name}
        </h3>

        {project.claudeTabs.length > 0 && (
          <div className="mb-3 p-2 rounded bg-amber-400/10 border border-amber-400/20">
            <p className="text-xs text-amber-400 font-medium mb-1">
              Active Claude sessions:
            </p>
            {project.claudeTabs.map((title, i) => (
              <p key={i} className="text-xs text-amber-300/80 pl-2 truncate">
                {title}
              </p>
            ))}
          </div>
        )}

        <label className="block text-xs text-gray-400 mb-1">
          State description
        </label>
        <textarea
          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-gray-500"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Where you left off..."
        />

        <div className="flex gap-2 mt-3">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(description)}
            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
          >
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}
