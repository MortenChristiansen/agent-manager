import { spawn } from "child_process";
import { wslToWindows } from "../shared/paths";
import { runPowerShell } from "./powershell";

interface LaunchOptions {
  projectName: string;
  wslPath: string;
  profile?: string;
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

/**
 * Launch a Windows Terminal window and return its PID.
 * wt.exe is a broker that exits immediately, so we diff the process list
 * before/after to find the new WindowsTerminal.exe process.
 */
export async function launchTerminal({ projectName, wslPath, profile }: LaunchOptions): Promise<number | null> {
  const pidsBefore = getTerminalPids();
  const winPath = wslToWindows(wslPath);
  const args = [
    "-w", "new",
    "--title", projectName,
    ...(profile ? ["--profile", profile] : []),
    "--startingDirectory", winPath,
    "wsl.exe", "-e", "bash", "-lic",
    `cd ${JSON.stringify(wslPath)} && claude --dangerously-skip-permissions`,
  ];

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
