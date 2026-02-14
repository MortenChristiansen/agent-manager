import { execSync } from "child_process";

/** Run a PowerShell command via powershell.exe from WSL */
export function runPowerShell(command: string): string {
  try {
    return execSync(`powershell.exe -NoProfile -NonInteractive -Command "${command.replace(/"/g, '\\"')}"`, {
      encoding: "utf-8",
      timeout: 15000,
    }).trim();
  } catch (e: any) {
    console.error(`PowerShell error: ${e.message}`);
    return "";
  }
}

/** Run a multi-line PowerShell script via -EncodedCommand (avoids quoting issues with Add-Type etc.) */
export function runPowerShellScript(script: string): string {
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  try {
    return execSync(
      `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
      { encoding: "utf-8", timeout: 15000 }
    ).trim();
  } catch (e: any) {
    console.error(`PowerShell error: ${e.message}`);
    return "";
  }
}

/** Play notification sound via PowerShell */
export function playNotificationSound() {
  runPowerShell("[System.Media.SystemSounds]::Asterisk.Play()");
}
