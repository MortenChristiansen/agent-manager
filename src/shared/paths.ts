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

export function agentProjectStatusPath(projectPath: string): string {
  return join(agentProjectDir(projectPath), "status.json");
}

/** Convert WSL path to Windows UNC path */
export function wslToWindows(wslPath: string): string {
  // /home/user/foo -> \\wsl.localhost\Ubuntu/home/user/foo
  return `\\\\wsl.localhost\\Ubuntu${wslPath}`;
}

/** Convert Windows UNC path back to WSL */
export function windowsToWsl(winPath: string): string {
  const prefix = "\\\\wsl.localhost\\Ubuntu";
  if (winPath.startsWith(prefix)) {
    return winPath.slice(prefix.length).replace(/\\/g, "/");
  }
  return winPath;
}
