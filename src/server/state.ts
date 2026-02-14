import { readFileSync, existsSync, writeFileSync } from "fs";
import YAML from "yaml";
import {
  ProjectStateSchema,
  type ProjectState,
  type GlobalConfig,
  type ProjectWithState,
  type TabStatus,
  AgentProjectStatusSchema,
} from "../shared/types";
import { projectStatePath, agentProjectStatusPath } from "../shared/paths";
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

export function loadTabStatus(projectPath: string): TabStatus[] {
  const statusPath = agentProjectStatusPath(projectPath);
  if (!existsSync(statusPath)) return [];

  try {
    const raw = readFileSync(statusPath, "utf-8");
    const parsed = JSON.parse(raw);
    const status = AgentProjectStatusSchema.parse(parsed);
    return status.tabs;
  } catch {
    return [];
  }
}

export function buildProjectsWithState(
  config: GlobalConfig
): ProjectWithState[] {
  return Object.entries(config.projects).map(([name, projectConfig]) => ({
    name,
    config: projectConfig,
    state: loadProjectState(name),
    tabs: loadTabStatus(projectConfig.path),
  }));
}
