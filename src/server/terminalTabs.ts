import { runPowerShellScript } from "./powershell";
import { loadProjectState, getClaudeTabs, setClaudeTabs } from "./state";
import { playNotificationSound } from "./powershell";
import { listWindowsOnDesktop } from "./desktop";
import type { GlobalConfig, WSMessage } from "../shared/types";

/**
 * Get all WindowsTerminal processes as {pid, hwnd} pairs.
 */
function getAllTerminalWindows(): { pid: number; hwnd: string }[] {
  const script = `
$ProgressPreference = 'SilentlyContinue'
Get-Process WindowsTerminal -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Output "$($_.Id):$($_.MainWindowHandle)"
}`;
  const output = runPowerShellScript(script, true);
  if (!output) return [];
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [pid, hwnd] = line.split(":");
      return { pid: Number(pid), hwnd };
    })
    .filter((e) => e.pid > 0 && e.hwnd && e.hwnd !== "0");
}

/**
 * Get tab titles from a Windows Terminal window by PID.
 * Uses Windows UI Automation to enumerate TabItem controls.
 */
function getTerminalTabTitles(terminalPid: number): string[] {
  const script = `
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
  Add-Type -AssemblyName UIAutomationClient
  Add-Type -AssemblyName UIAutomationTypes
  $proc = Get-Process -Id ${terminalPid} -ErrorAction Stop
  $el = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
  $cond = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::TabItem
  )
  $tabs = $el.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)
  foreach ($tab in $tabs) {
    Write-Output $tab.Current.Name
  }
} catch {}`;

  const output = runPowerShellScript(script, true);
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean);
}

/**
 * Poll all active projects for Claude tab titles.
 * Matches terminal windows to projects by virtual desktop.
 * Tabs with a Unicode spinner prefix are considered actively working.
 * Plays notification sound when a tab finishes (spinner disappears).
 */
export function pollClaudeTabs(
  loadConfig: () => GlobalConfig,
  broadcast: (msg: WSMessage) => void,
) {
  const config = loadConfig();

  // Get all WindowsTerminal windows once per poll cycle
  const terminalWindows = getAllTerminalWindows();
  if (terminalWindows.length === 0) return;

  for (const name of Object.keys(config.projects)) {
    const state = loadProjectState(name);
    if (state.status !== "active" || !state.desktopName) continue;

    // Get HWNDs on this project's virtual desktop
    const desktopHandles = new Set(listWindowsOnDesktop(state.desktopName));

    // Find terminal windows on this desktop by intersecting
    const matchedPids = terminalWindows
      .filter((tw) => desktopHandles.has(tw.hwnd))
      .map((tw) => tw.pid);

    // Collect tab titles from matched terminal windows
    const allTitles: string[] = [];
    for (const pid of matchedPids) {
      allTitles.push(...getTerminalTabTitles(pid));
    }

    // Claude Code sets tab title to "<spinner> <task>" when processing
    const activeTitles = allTitles.filter((t) => /^[^\x00-\x7F] .+/.test(t));

    const prev = getClaudeTabs(name);
    const key = JSON.stringify(activeTitles);
    if (key === JSON.stringify(prev)) continue;

    // Detect finished tabs (had spinner before, now gone)
    const prevSet = new Set(prev);
    const currentSet = new Set(activeTitles);
    for (const title of prevSet) {
      if (!currentSet.has(title)) {
        playNotificationSound();
        break;
      }
    }

    setClaudeTabs(name, activeTitles);
    broadcast({ type: "claudeTabs", project: name, data: activeTitles });
  }
}
