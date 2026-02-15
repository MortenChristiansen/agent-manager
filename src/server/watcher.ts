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

  // Poll-based: fs.watch is unreliable on WSL2
  const STALE_MS = 60_000; // 60s — idle entries older than this are dropped
  let lastBroadcast = "";
  const poll = setInterval(() => {
    try {
      const raw = readFileSync(statusPath, "utf-8");
      const parsed = AgentProjectStatusSchema.parse(JSON.parse(raw));
      const now = Date.now();
      const liveTabs = parsed.tabs.filter((t) => {
        if (t.state === "processing") return true;
        const age = now - new Date(t.lastActivity).getTime();
        return age < STALE_MS;
      });
      const key = JSON.stringify(liveTabs);
      if (key !== lastBroadcast) {
        lastBroadcast = key;
        onUpdate(projectName, liveTabs);
      }
    } catch {
      // file may not exist yet or be mid-write
    }
  }, 2000);

  // Return a fake FSWatcher-like object for cleanup
  const pseudoWatcher = {
    close: () => clearInterval(poll),
  } as unknown as FSWatcher;
  watchers.push(pseudoWatcher);
  return pseudoWatcher;
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
