import { execSync } from "child_process";
import { runPowerShellScript } from "./powershell";

// Resolve VirtualDesktop11.exe path on the Windows side
const WIN_USER = execSync("powershell.exe -NoProfile -Command [System.Environment]::UserName", {
  encoding: "utf-8",
  timeout: 5000,
}).trim();
const VD = `/mnt/c/Users/${WIN_USER}/.agent-manager/tools/VirtualDesktop11.exe`;

let available: boolean | null = null;

function isAvailable(): boolean {
  if (available === null) {
    try {
      // VirtualDesktop11 returns desktop number as exit code (non-zero), so execSync throws.
      // We just need to check that it runs and produces output.
      execSync(`${VD} /Count`, { encoding: "utf-8", timeout: 5000 });
      available = true;
    } catch (e: any) {
      const output = (e.stdout ?? "").toString();
      if (output.includes("Count of desktops")) {
        available = true;
      } else {
        console.warn(`VirtualDesktop11.exe not found at ${VD} — virtual desktop management disabled`);
        available = false;
      }
    }
  }
  return available;
}

function run(args: string): string {
  if (!isAvailable()) return "";
  try {
    return execSync(`${VD} ${args}`, {
      encoding: "utf-8",
      timeout: 10000,
    }).trim();
  } catch (e: any) {
    // VirtualDesktop11 returns the desktop number as exit code; stdout still has useful output
    const output = (e.stdout ?? "").toString().trim();
    if (output) return output;
    console.error(`VirtualDesktop11 error (${args}): ${e.message}`);
    return "";
  }
}

/** Run VD11 and return exit code (used for boolean queries like /IsWindowHandlePinned) */
function runExitCode(args: string): number {
  if (!isAvailable()) return -1;
  try {
    execSync(`${VD} ${args}`, { encoding: "utf-8", timeout: 10000 });
    return 0;
  } catch (e: any) {
    return e.status ?? -1;
  }
}

export function createDesktop(name: string): string {
  return run(`/New /Name:${name}`);
}

export function removeDesktop(name: string): string {
  return run(`/Remove:${name}`);
}

export function switchToDesktop(name: string): string {
  return run(`/Switch:${name}`);
}

export function getCurrentDesktopName(): string {
  const output = run("/GetCurrentDesktop");
  // Output: "Current desktop: 'MyDesktop' (desktop number 2)"
  const match = output.match(/'([^']+)'/);
  return match ? match[1] : output;
}

/** Close all non-pinned windows on a virtual desktop */
export function closeWindowsOnDesktop(desktopName: string): void {
  const output = run(`/ListWindowsOnDesktop:${desktopName}`);
  const handles = output
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));

  const toClose: string[] = [];
  for (const handle of handles) {
    // /IsWindowHandlePinned returns exit code 0 = pinned, 1 = not pinned
    if (runExitCode(`/IsWindowHandlePinned:${handle}`) !== 0) {
      toClose.push(handle);
    }
  }

  if (toClose.length === 0) return;

  // Send WM_CLOSE to each unpinned window
  const closeStatements = toClose
    .map((h) => `[W]::PostMessage([IntPtr]${h}, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null`)
    .join("\n");

  runPowerShellScript(`
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class W {
    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
}
'@
${closeStatements}
  `);
}

export function pinWindow(titleFragment: string): string {
  return run(`"/PinWindowHandle:${titleFragment}"`);
}
