import { watch, existsSync, readFileSync, type FSWatcher } from "fs";
import { dirname } from "path";
import {
  AgentProjectStatusSchema,
  HistoryEntrySchema,
  type TabStatus,
  type PromptEntry,
} from "../shared/types";
import { CLAUDE_HISTORY_PATH, agentProjectStatusPath } from "../shared/paths";

type TabStatusCallback = (project: string, tabs: TabStatus[]) => void;
type PromptCallback = (entry: PromptEntry) => void;

const watchers: FSWatcher[] = [];

export function watchAgentProjectStatus(
  projectName: string,
  projectPath: string,
  onUpdate: TabStatusCallback
): FSWatcher | null {
  const statusPath = agentProjectStatusPath(projectPath);
  const dir = dirname(statusPath);

  if (!existsSync(dir)) return null;

  try {
    const w = watch(dir, (event, filename) => {
      if (filename === "status.json") {
        try {
          const raw = readFileSync(statusPath, "utf-8");
          const parsed = AgentProjectStatusSchema.parse(JSON.parse(raw));
          onUpdate(projectName, parsed.tabs);
        } catch {
          // file may be mid-write
        }
      }
    });
    watchers.push(w);
    return w;
  } catch {
    return null;
  }
}

export function loadRecentPrompts(
  count: number,
  projectPaths: Map<string, string> // path -> name
): PromptEntry[] {
  if (!existsSync(CLAUDE_HISTORY_PATH)) return [];

  try {
    const content = readFileSync(CLAUDE_HISTORY_PATH, "utf-8");
    const lines = content.split("\n").filter(Boolean);
    const recent = lines.slice(-count);
    const entries: PromptEntry[] = [];

    for (const line of recent) {
      try {
        const entry = HistoryEntrySchema.parse(JSON.parse(line));
        const projectName = entry.project
          ? projectPaths.get(entry.project) ?? basename(entry.project)
          : "unknown";
        entries.push({
          timestamp: entry.timestamp,
          project: projectName,
          text: entry.display,
        });
      } catch {
        // skip malformed
      }
    }

    return entries.reverse(); // newest first
  } catch {
    return [];
  }
}

export function watchPromptHistory(
  onPrompt: PromptCallback,
  projectPaths: Map<string, string> // path -> name
): FSWatcher | null {
  if (!existsSync(CLAUDE_HISTORY_PATH)) return null;

  // Track file size to only read new lines
  let lastSize = 0;
  try {
    const stat = Bun.file(CLAUDE_HISTORY_PATH);
    // We'll init size on first check
    lastSize = 0;
  } catch {
    // ignore
  }

  // Read initial size
  try {
    const content = readFileSync(CLAUDE_HISTORY_PATH, "utf-8");
    lastSize = Buffer.byteLength(content, "utf-8");
  } catch {
    // ignore
  }

  try {
    const dir = dirname(CLAUDE_HISTORY_PATH);
    const w = watch(dir, (event, filename) => {
      if (filename !== "history.jsonl") return;

      try {
        const content = readFileSync(CLAUDE_HISTORY_PATH, "utf-8");
        const currentSize = Buffer.byteLength(content, "utf-8");

        if (currentSize <= lastSize) {
          lastSize = currentSize;
          return;
        }

        // Extract new bytes
        const newContent = Buffer.from(content, "utf-8")
          .subarray(lastSize)
          .toString("utf-8");
        lastSize = currentSize;

        const lines = newContent.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const entry = HistoryEntrySchema.parse(JSON.parse(line));
            const projectName = entry.project
              ? projectPaths.get(entry.project) ?? basename(entry.project)
              : "unknown";

            onPrompt({
              timestamp: entry.timestamp,
              project: projectName,
              text: entry.display,
            });
          } catch {
            // skip malformed lines
          }
        }
      } catch {
        // ignore read errors
      }
    });
    watchers.push(w);
    return w;
  } catch {
    return null;
  }
}

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

export function closeAllWatchers() {
  for (const w of watchers) {
    try {
      w.close();
    } catch {
      // ignore
    }
  }
  watchers.length = 0;
}
