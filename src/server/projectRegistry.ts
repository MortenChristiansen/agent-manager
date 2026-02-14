import { watchAgentProjectStatus } from "./watcher";
import { broadcast } from "./api/websocket";
import { playNotificationSound } from "./powershell";
import type { TabStatus } from "../shared/types";

// Track previous tab states for processing->idle detection
const previousTabStates = new Map<string, Map<string, string>>();

// Map project paths to names for prompt history resolution
export const projectPathToName = new Map<string, string>();

export function registerProjectWatcher(name: string, projectPath: string) {
  projectPathToName.set(projectPath, name);

  watchAgentProjectStatus(name, projectPath, (projectName, tabs) => {
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
