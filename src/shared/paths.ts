import { homedir } from "os";
import { join } from "path";

export const HOME = homedir();
export const AGENT_MANAGER_DIR = join(HOME, ".agent-manager");
export const CONFIG_PATH = join(AGENT_MANAGER_DIR, "config.yaml");
export const STATE_DIR = join(AGENT_MANAGER_DIR, "state");
export const WALLPAPER_DIR = join(AGENT_MANAGER_DIR, "wallpapers");
export const PROTOCOL_DIR = join(AGENT_MANAGER_DIR, "protocol");
export const CLAUDE_HISTORY_PATH = join(HOME, ".claude", "history.jsonl");

export function projectStatePath(name: string): string {
  return join(STATE_DIR, `${name}.yaml`);
}

export function agentProjectDir(projectPath: string): string {
  return join(projectPath, ".agent-project");
}

export function agentProjectTasksPath(projectPath: string): string {
  return join(agentProjectDir(projectPath), "tasks.json");
}

const WSL_DISTRO = process.env.WSL_DISTRO_NAME ?? "Ubuntu-24.04";

/** Convert WSL path to Windows UNC path */
export function wslToWindows(wslPath: string): string {
  return `\\\\wsl.localhost\\${WSL_DISTRO}${wslPath}`;
}

/** Convert Windows UNC path back to WSL */
export function windowsToWsl(winPath: string): string {
  const prefix = `\\\\wsl.localhost\\${WSL_DISTRO}`;
  if (winPath.startsWith(prefix)) {
    return winPath.slice(prefix.length).replace(/\\/g, "/");
  }
  return winPath;
}
