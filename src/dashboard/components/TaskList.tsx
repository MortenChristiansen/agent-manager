import { useState, useRef, useCallback } from "react";

interface Props {
  tasks: string[];
  projectName: string;
}

interface CompletedTask {
  text: string;
  originalIndex: number;
}

export function TaskList({ tasks, projectName }: Props) {
  const [completed, setCompleted] = useState<CompletedTask[]>([]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTask = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await fetch(`/api/projects/${projectName}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: text }),
    });
    inputRef.current?.focus();
  }, [input, projectName]);

  const removeTask = useCallback(
    async (index: number) => {
      // Move to completed (in-memory)
      setCompleted((prev) => [...prev, { text: tasks[index], originalIndex: index }]);
      await fetch(`/api/projects/${projectName}/tasks/${index}`, {
        method: "DELETE",
      });
    },
    [tasks, projectName]
  );

  const uncomplete = useCallback(
    async (completedIndex: number) => {
      const task = completed[completedIndex];
      setCompleted((prev) => prev.filter((_, i) => i !== completedIndex));
      await fetch(`/api/projects/${projectName}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: task.text }),
      });
    },
    [completed, projectName]
  );

  return (
    <div className="space-y-1">
      {/* Add task input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTask();
        }}
        className="flex gap-1.5 mb-2"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add task..."
          className="flex-1 min-w-0 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-600"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          +
        </button>
      </form>

      {/* Active tasks */}
      {tasks.map((task, i) => (
        <label
          key={`active-${i}`}
          className="flex items-start gap-2 text-xs cursor-pointer group hover:bg-gray-900/50 rounded px-1 py-0.5"
        >
          <input
            type="checkbox"
            checked={false}
            onChange={() => removeTask(i)}
            className="mt-0.5 shrink-0 accent-gray-600"
          />
          <span className="text-gray-300 break-words min-w-0">{task}</span>
        </label>
      ))}

      {/* Completed tasks (in-memory only) */}
      {completed.map((item, i) => (
        <label
          key={`done-${i}`}
          className="flex items-start gap-2 text-xs cursor-pointer group hover:bg-gray-900/50 rounded px-1 py-0.5"
        >
          <input
            type="checkbox"
            checked={true}
            onChange={() => uncomplete(i)}
            className="mt-0.5 shrink-0 accent-gray-600"
          />
          <span className="text-gray-600 line-through break-words min-w-0">{item.text}</span>
        </label>
      ))}

      {tasks.length === 0 && completed.length === 0 && (
        <div className="text-xs text-gray-600 text-center py-2">No tasks</div>
      )}
    </div>
  );
}
