import { execSync } from "child_process";
import type { PrInfo } from "../shared/types";

interface PrBasic {
  prNumber: number;
  prUrl: string;
}

interface RepoInfo {
  owner: string;
  name: string;
}

function getPrForBranch(projectPath: string): PrBasic | null {
  try {
    const raw = execSync("gh pr view --json number,url,state", {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 10_000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    const data = JSON.parse(raw);
    if (data.state !== "OPEN") return null;
    return { prNumber: data.number, prUrl: data.url };
  } catch {
    return null;
  }
}

function getRepoInfo(projectPath: string): RepoInfo | null {
  try {
    const raw = execSync("gh repo view --json owner,name", {
      cwd: projectPath,
      encoding: "utf-8",
      timeout: 10_000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    const data = JSON.parse(raw);
    return { owner: data.owner.login, name: data.name };
  } catch {
    return null;
  }
}

/** gh api --paginate can return concatenated JSON arrays like `[...][...]` */
function parsePaginated(raw: string): any[] {
  try {
    return JSON.parse(raw);
  } catch {
    // Split on `][` boundaries and merge
    const parts = raw.split(/\]\s*\[/).map((s, i, a) => {
      if (a.length === 1) return s;
      if (i === 0) return s + "]";
      if (i === a.length - 1) return "[" + s;
      return "[" + s + "]";
    });
    return parts.flatMap((p) => JSON.parse(p));
  }
}

function getCoderabbitStatus(
  projectPath: string,
  owner: string,
  repo: string,
  prNumber: number
): PrInfo["coderabbit"] {
  try {
    // Get HEAD commit SHA for the PR branch
    const headSha = execSync(
      `gh pr view ${prNumber} --json headRefOid --jq .headRefOid`,
      { cwd: projectPath, encoding: "utf-8", timeout: 10_000, stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    if (!headSha) return null;

    // Check commit statuses for CodeRabbit's status check
    const statusRaw = execSync(
      `gh api repos/${owner}/${repo}/commits/${headSha}/statuses`,
      { cwd: projectPath, encoding: "utf-8", timeout: 15_000, stdio: ["pipe", "pipe", "pipe"] }
    );
    const statuses: any[] = parsePaginated(statusRaw || "[]");
    const crabStatus = statuses.find(
      (s: any) => s.context?.toLowerCase() === "coderabbit"
    );

    if (!crabStatus) return null;

    // CodeRabbit sets state "success" with description "Review completed" when done
    const status = crabStatus.state === "success" ? "approved"
      : crabStatus.state === "pending" ? "active"
      : "active";

    return { reviewed: true, status };
  } catch {
    return null;
  }
}

export function getPrInfo(projectPath: string): PrInfo | null {
  const pr = getPrForBranch(projectPath);
  if (!pr) return null;

  const repo = getRepoInfo(projectPath);
  const coderabbit = repo
    ? getCoderabbitStatus(projectPath, repo.owner, repo.name, pr.prNumber)
    : null;

  return { ...pr, coderabbit };
}
