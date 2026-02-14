import { loadConfig, ensureDirs } from "./config";
import { buildProjectsWithState, loadProjectState } from "./state";
import { getGitInfo } from "./git";
import {
  watchAgentProjectStatus,
  watchPromptHistory,
  loadRecentPrompts,
  closeAllWatchers,
} from "./watcher";
import { handleApiRequest } from "./api/routes";
import { addClient, removeClient, broadcast } from "./api/websocket";
import { playNotificationSound } from "./powershell";
import { getCurrentDesktopName, pinWindow } from "./desktop";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

ensureDirs();

const config = loadConfig();
const port = config.dashboard.port;

// Track previous tab states for processing->idle detection
const previousTabStates = new Map<string, Map<string, string>>();

// --- File watchers ---

// Watch .agent-project/status.json for each project
for (const [name, project] of Object.entries(config.projects)) {
  watchAgentProjectStatus(name, project.path, (projectName, tabs) => {
    // Check for processing -> idle transitions (sound notification)
    const prev = previousTabStates.get(projectName) ?? new Map();
    for (const tab of tabs) {
      const prevState = prev.get(tab.tabName);
      if (prevState === "processing" && tab.state === "idle") {
        playNotificationSound();
      }
      prev.set(tab.tabName, tab.state);
    }
    previousTabStates.set(projectName, prev);

    broadcast({ type: "tabStatus", project: projectName, data: tabs });
  });
}

// Watch prompt history
const projectPathToName = new Map<string, string>();
for (const [name, project] of Object.entries(config.projects)) {
  projectPathToName.set(project.path, name);
}

watchPromptHistory((entry) => {
  broadcast({ type: "prompt", data: entry });
}, projectPathToName);

// --- Git polling (every 10s) ---

const GIT_POLL_INTERVAL = 10_000;

async function pollGit() {
  for (const [name, project] of Object.entries(config.projects)) {
    const state = loadProjectState(name);
    if (state.status !== "active") continue;

    const git = getGitInfo(project.path);
    const changed =
      git.branch !== state.gitBranch ||
      git.statusSummary !== state.gitStatusSummary;

    if (changed) {
      state.gitBranch = git.branch;
      state.gitStatusSummary = git.statusSummary;
      saveProjectState(name, state);

      const projects = buildProjectsWithState(config);
      const updated = projects.find((p) => p.name === name);
      if (updated) {
        broadcast({ type: "projectUpdate", data: updated });
      }
    }
  }
}

setInterval(pollGit, GIT_POLL_INTERVAL);
// Initial poll
pollGit();

// --- Desktop polling (1s) ---

let lastDesktopName = "";

function pollDesktop() {
  try {
    const current = getCurrentDesktopName();
    if (current && current !== lastDesktopName) {
      lastDesktopName = current;
      broadcast({ type: "currentDesktop", data: current });
    }
  } catch {
    // ignore polling errors
  }
}

setInterval(pollDesktop, 1000);

// --- Serve dashboard static files in production ---

function serveDashboard(url: URL): Response | null {
  const distDir = join(import.meta.dir, "../../dist/dashboard");
  if (!existsSync(distDir)) return null;

  let filePath = join(distDir, url.pathname === "/" ? "index.html" : url.pathname);
  if (!existsSync(filePath)) {
    filePath = join(distDir, "index.html"); // SPA fallback
  }

  try {
    const content = readFileSync(filePath);
    const ext = filePath.split(".").pop();
    const mimeTypes: Record<string, string> = {
      html: "text/html",
      js: "application/javascript",
      css: "text/css",
      json: "application/json",
      png: "image/png",
      svg: "image/svg+xml",
    };
    return new Response(content, {
      headers: { "Content-Type": mimeTypes[ext ?? ""] ?? "application/octet-stream" },
    });
  } catch {
    return null;
  }
}

// --- HTTP + WebSocket server ---

const server = Bun.serve({
  port,
  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return undefined as any;
    }

    // API routes
    if (url.pathname.startsWith("/api/")) {
      return handleApiRequest(req, url);
    }

    // Static dashboard files (production)
    const staticRes = serveDashboard(url);
    if (staticRes) return staticRes;

    // Fallback
    return new Response("Not found", { status: 404 });
  },
  websocket: {
    open(ws) {
      addClient(ws);
      // Send initial state
      const projects = buildProjectsWithState(config);
      ws.send(JSON.stringify({ type: "projects", data: projects }));
      // Send recent prompt history
      const recentPrompts = loadRecentPrompts(50, projectPathToName);
      ws.send(JSON.stringify({ type: "prompts", data: recentPrompts }));
      // Send current desktop
      if (lastDesktopName) {
        ws.send(JSON.stringify({ type: "currentDesktop", data: lastDesktopName }));
      }
    },
    message(_ws, _message) {
      // Client doesn't send messages yet
    },
    close(ws) {
      removeClient(ws);
    },
  },
});

console.log(`Agent Manager server running on http://localhost:${port}`);

// Pin Electron window after short delay to ensure it's up
setTimeout(() => {
  pinWindow("Agent Manager");
}, 2000);

// Cleanup on exit
process.on("SIGINT", () => {
  closeAllWatchers();
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  closeAllWatchers();
  server.stop();
  process.exit(0);
});
