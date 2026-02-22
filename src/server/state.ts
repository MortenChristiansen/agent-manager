import { readFileSync, existsSync, writeFileSync } from "fs";
import YAML from "yaml";
import {
  ProjectStateSchema,
  type ProjectState,
  type GlobalConfig,
  type ProjectWithState,
  type PrInfo,
} from "../shared/types";
import { projectStatePath, agentProjectTasksPath } from "../shared/paths";
import { ensureDirs } from "./config";

const DEFAULT_STATE: ProjectState = {
  status: "dormant",
  lastActivated: null,
  lastDeactivated: null,
  desktopName: null,
  windowHandles: {},
  stateDescription: "",
  gitBranch: "",
  gitStatusSummary: "",
};

// Status is transient (in-memory only), always starts dormant
const runtimeStatus = new Map<string, ProjectState["status"]>();

export function getProjectStatus(name: string): ProjectState["status"] {
  return runtimeStatus.get(name) ?? "dormant";
}

export function setProjectStatus(name: string, status: ProjectState["status"]) {
  runtimeStatus.set(name, status);
}

export function loadProjectState(name: string): ProjectState {
  const path = projectStatePath(name);
  if (!existsSync(path)) return { ...DEFAULT_STATE };

  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = YAML.parse(raw) ?? {};
    const state = ProjectStateSchema.parse(parsed);
    state.status = getProjectStatus(name);
    return state;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveProjectState(name: string, state: ProjectState) {
  ensureDirs();
  const { status, ...persisted } = state;
  writeFileSync(projectStatePath(name), YAML.stringify(persisted), "utf-8");
}

export function loadTasks(projectPath: string): string[] {
  const tasksPath = agentProjectTasksPath(projectPath);
  if (!existsSync(tasksPath)) return [];
  try {
    const raw = readFileSync(tasksPath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTasks(projectPath: string, tasks: string[]) {
  writeFileSync(agentProjectTasksPath(projectPath), JSON.stringify(tasks, null, 2), "utf-8");
}

// In-memory cache of active Claude tab titles per project (set by terminal tab poller)
const claudeTabsCache = new Map<string, string[]>();

export function getClaudeTabs(name: string): string[] {
  return claudeTabsCache.get(name) ?? [];
}

export function setClaudeTabs(name: string, tabs: string[]) {
  claudeTabsCache.set(name, tabs);
}

// In-memory cache of PR info per project
const prInfoCache = new Map<string, PrInfo | null>();

export function getPrInfoCached(name: string): PrInfo | null {
  return prInfoCache.get(name) ?? null;
}

export function setPrInfoCached(name: string, info: PrInfo | null) {
  prInfoCache.set(name, info);
}

export function buildProjectsWithState(
  config: GlobalConfig
): ProjectWithState[] {
  return Object.entries(config.projects).map(([name, projectConfig]) => ({
    name,
    config: projectConfig,
    state: loadProjectState(name),
    claudeTabs: getClaudeTabs(name),
    prInfo: getPrInfoCached(name),
  }));
}
