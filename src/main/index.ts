import { app, BrowserWindow, screen, ipcMain } from 'electron';
import path from 'path';
import { spawn, execSync, ChildProcess } from 'child_process';
import http from 'http';

const isDev = !!process.env.VITE_DEV_SERVER_URL;

function winPathToWsl(winPath: string): string {
  const m = winPath.match(/^([A-Za-z]):\\(.*)$/);
  if (!m) return winPath;
  return `/mnt/${m[1].toLowerCase()}/${m[2].replace(/\\/g, '/')}`;
}

function pollServer(url: string, timeout = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http.get(url, (res) => {
        res.resume();
        resolve();
      }).on('error', () => {
        if (Date.now() - start > timeout) reject(new Error('Server start timeout'));
        else setTimeout(check, 200);
      });
    };
    check();
  });
}

let serverProcess: ChildProcess | null = null;

async function startServer(): Promise<void> {
  // __dirname is like C:\Users\morten\.agent-manager\out\main
  const appRoot = path.resolve(__dirname, '../..');
  const wslRoot = winPathToWsl(appRoot);

  // cd first (bun can't resolve absolute /mnt/c paths) and use ~/.bun/bin/bun
  // to avoid picking up Windows bun from PATH
  const cmd = `cd ${wslRoot} && ~/.bun/bin/bun dist/server/index.js`;
  console.log(`[main] Starting server: wsl.exe bash -lc "${cmd}"`);
  serverProcess = spawn('wsl.exe', ['bash', '-lc', cmd], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout?.on('data', (d) => process.stdout.write(`[server] ${d}`));
  serverProcess.stderr?.on('data', (d) => process.stderr.write(`[server] ${d}`));
  serverProcess.on('exit', (code) => console.log(`[main] Server exited (${code})`));

  await pollServer('http://localhost:7890');
  console.log('[main] Server ready');
}

app.whenReady().then(async () => {
  if (!isDev) {
    const appRoot = path.resolve(__dirname, '../..');
    app.setPath('userData', path.join(appRoot, 'electron-data'));
    await startServer();
  }

  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const [winW, winH] = [380, 900];

  const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  const iconPath = path.join(__dirname, '../../resources', iconFile);

  const win = new BrowserWindow({
    title: 'Agent Manager',
    width: winW,
    height: winH,
    x: screenW - winW,
    y: Math.round((screenH - winH) / 2),
    icon: iconPath,
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false,
    },
  });

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Pin to all virtual desktops via VirtualDesktop11 using native window handle
  try {
    const hwnd = win.getNativeWindowHandle().readUInt32LE(0);
    const username = execSync('powershell.exe -NoProfile -Command [System.Environment]::UserName', {
      encoding: 'utf-8', timeout: 5000,
    }).trim();
    const vd = `C:\\Users\\${username}\\.agent-manager\\tools\\VirtualDesktop11.exe`;
    execSync(`"${vd}" /PinWindowHandle:${hwnd}`, { timeout: 5000 });
    console.log(`[main] Pinned window (HWND ${hwnd}) to all desktops`);
  } catch (e: any) {
    console.warn('[main] VD11 pin failed:', e.message);
  }

  const url = process.env.VITE_DEV_SERVER_URL || 'http://localhost:7890';
  win.loadURL(url);

  ipcMain.on('win:minimize', () => win.minimize());
  ipcMain.on('win:close', () => app.quit());
});

app.on('will-quit', () => {
  if (serverProcess && !serverProcess.killed) {
    console.log('[main] Killing server process');
    serverProcess.kill();
  }
});
