import { useState } from "react";

interface Props {
  onSubmit: (data: { name: string; path: string; color: string; description: string }) => void;
  onCancel: () => void;
}

function randomColor() {
  const colors = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function AddProjectModal({ onSubmit, onCancel }: Props) {
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [nameManual, setNameManual] = useState(false);
  const [color, setColor] = useState(randomColor);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handlePathChange = (val: string) => {
    setPath(val);
    if (!nameManual) {
      const derived = val.replace(/\/+$/, "").split("/").pop() || "";
      setName(derived);
    }
  };

  const handleNameChange = (val: string) => {
    setNameManual(true);
    setName(val);
  };

  const handleSubmit = async () => {
    if (!path.trim()) {
      setError("Path is required");
      return;
    }
    setError("");
    setSubmitting(true);
    onSubmit({ name: name || path.split("/").pop() || "", path: path.trim(), color, description });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm p-4">
        <h3 className="text-sm font-semibold mb-3">Add Project</h3>

        {error && (
          <div className="mb-3 p-2 rounded bg-red-400/10 border border-red-400/20">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <label className="block text-xs text-gray-400 mb-1">Path</label>
        <input
          type="text"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-gray-500 mb-3"
          value={path}
          onChange={(e) => handlePathChange(e.target.value)}
          placeholder="/home/user/projects/my-app"
          autoFocus
        />

        <label className="block text-xs text-gray-400 mb-1">Name</label>
        <input
          type="text"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-gray-500 mb-3"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Derived from path"
        />

        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="w-8 h-8 rounded border border-gray-700 bg-transparent cursor-pointer"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
              <span className="text-xs text-gray-500">{color}</span>
            </div>
          </div>
        </div>

        <label className="block text-xs text-gray-400 mb-1">Description</label>
        <textarea
          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-gray-500"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
        />

        <div className="flex gap-2 mt-3">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !path.trim()}
            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 transition-colors disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
