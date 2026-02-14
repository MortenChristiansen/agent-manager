import { execSync } from "child_process";

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

export function pinWindow(titleFragment: string): string {
  return run(`"/PinWindowHandle:${titleFragment}"`);
}
