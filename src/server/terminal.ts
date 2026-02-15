import { spawn } from "child_process";
import { wslToWindows } from "../shared/paths";
import { runPowerShell } from "./powershell";
import type { TerminalTab } from "../shared/types";

interface LaunchOptions {
  projectName: string;
  wslPath: string;
  profile?: string;
  shell?: "zsh" | "bash";
  tabs?: TerminalTab[];
}

/** Get current set of WindowsTerminal PIDs */
function getTerminalPids(): Set<number> {
  const out = runPowerShell(
    `Get-Process WindowsTerminal -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id`
  );
  return new Set(
    out.split(/\r?\n/).map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
  );
}

function buildTabArgs(
  tab: { command: string },
  wslPath: string,
  winPath: string,
  profile: string | undefined,
  shell: string,
): string[] {
  const effective = tab.command || "claude --dangerously-skip-permissions";
  const cmd = `cd ${JSON.stringify(wslPath)} && ${effective}`;
  return [
    ...(profile ? ["--profile", profile] : []),
    "--startingDirectory", winPath,
    "wsl.exe", "-e", shell, "-lic", cmd,
  ];
}

/**
 * Launch a Windows Terminal window and return its PID.
 * wt.exe is a broker that exits immediately, so we diff the process list
 * before/after to find the new WindowsTerminal.exe process.
 */
export async function launchTerminal({ projectName, wslPath, profile, shell = "zsh", tabs }: LaunchOptions): Promise<number | null> {
  const pidsBefore = getTerminalPids();
  const winPath = wslToWindows(wslPath);

  // Default to a single claude tab if no tabs configured
  const effectiveTabs = tabs && tabs.length > 0
    ? tabs
    : [{ name: "claude", command: "claude --dangerously-skip-permissions" }];

  // First tab: opens the new window
  const args: string[] = [
    "-w", "new",
    "--title", projectName,
    ...buildTabArgs(effectiveTabs[0], wslPath, winPath, profile, shell),
  ];

  // Additional tabs: separated by `;` then `new-tab`
  for (let i = 1; i < effectiveTabs.length; i++) {
    args.push(";", "new-tab", "--title", projectName);
    args.push(...buildTabArgs(effectiveTabs[i], wslPath, winPath, profile, shell));
  }

  const child = spawn("wt.exe", args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  // Poll for the new process (wt broker takes a moment to spawn the real window)
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const pidsAfter = getTerminalPids();
    const newPids = [...pidsAfter].filter((p) => !pidsBefore.has(p));
    if (newPids.length > 0) return newPids[0];
  }
  console.warn(`Could not detect new WindowsTerminal PID for ${projectName}`);
  return null;
}
