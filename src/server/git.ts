import { execSync } from "child_process";

interface GitInfo {
  branch: string;
  statusSummary: string;
}

export function getGitInfo(projectPath: string): GitInfo {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    const status = execSync("git status --porcelain", {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    const summary = summarizeStatus(status);
    return { branch, statusSummary: summary };
  } catch {
    return { branch: "", statusSummary: "" };
  }
}

function summarizeStatus(porcelain: string): string {
  if (!porcelain) return "clean";

  const lines = porcelain.split("\n").filter(Boolean);
  let modified = 0;
  let untracked = 0;
  let staged = 0;

  for (const line of lines) {
    const x = line[0];
    const y = line[1];

    if (x === "?" && y === "?") {
      untracked++;
    } else {
      if (x !== " " && x !== "?") staged++;
      if (y !== " " && y !== "?") modified++;
    }
  }

  const parts: string[] = [];
  if (modified) parts.push(`${modified}M`);
  if (untracked) parts.push(`${untracked}U`);
  if (staged) parts.push(`${staged}S`);
  return parts.length ? parts.join(" ") : "clean";
}
