// Map project paths to names for prompt history resolution
export const projectPathToName = new Map<string, string>();

export function registerProjectWatcher(name: string, projectPath: string) {
  projectPathToName.set(projectPath, name);
}
