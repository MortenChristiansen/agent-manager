import { runPowerShellScript } from "./powershell";
import { loadProjectState, getClaudeTabs, setClaudeTabs } from "./state";
import { playNotificationSound } from "./powershell";
import { listWindowsOnDesktop } from "./desktop";
import type { GlobalConfig, WSMessage } from "../shared/types";

/**
 * Get tab titles from Windows Terminal windows identified by HWNDs.
 * Filters for terminal windows via Win32 GetClassName.
 * Tries UI Automation first (returns all tabs), falls back to GetWindowText
 * (returns only the active tab's title but works on non-visible virtual desktops).
 */
function getTerminalTabTitlesFromHandles(handles: string[]): string[] {
  if (handles.length === 0) return [];

  const handleList = handles.map((h) => `[IntPtr]${h}`).join(",");
  const script = `
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinUtil {
    [DllImport("user32.dll", CharSet=CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, System.Text.StringBuilder lpClassName, int nMaxCount);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);
}
"@
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
foreach ($h in @(${handleList})) {
  try {
    $sb = New-Object System.Text.StringBuilder 256
    [WinUtil]::GetClassName($h, $sb, 256) | Out-Null
    if ($sb.ToString() -ne 'CASCADIA_HOSTING_WINDOW_CLASS') { continue }
    # Try UI Automation (gets all tab titles, may fail on non-visible desktops)
    $found = $false
    try {
      $el = [System.Windows.Automation.AutomationElement]::FromHandle($h)
      $cond = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::TabItem
      )
      $tabs = $el.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)
      if ($tabs.Count -gt 0) {
        $found = $true
        foreach ($tab in $tabs) { Write-Output $tab.Current.Name }
      }
    } catch {}
    # Fallback: GetWindowText returns window title = active tab's title
    if (-not $found) {
      $sb2 = New-Object System.Text.StringBuilder 512
      [WinUtil]::GetWindowText($h, $sb2, 512) | Out-Null
      $t = $sb2.ToString()
      if ($t) { Write-Output $t }
    }
  } catch {}
}`;

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

  for (const name of Object.keys(config.projects)) {
    const state = loadProjectState(name);
    if (state.status !== "active" || !state.desktopName) continue;

    // Get all window handles on this project's desktop, then extract terminal tab titles.
    // Uses HWNDs from VD11 directly (works for all desktops, not just the active one).
    const desktopHandles = listWindowsOnDesktop(state.desktopName);
    const allTitles = getTerminalTabTitlesFromHandles(desktopHandles);

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
