import { app, BrowserWindow, screen, ipcMain } from 'electron';
import path from 'path';

app.whenReady().then(() => {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const [winW, winH] = [380, 900];

  const win = new BrowserWindow({
    width: winW,
    height: winH,
    x: screenW - winW,
    y: Math.round((screenH - winH) / 2),
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      sandbox: false,
    },
  });

  // Dev: Vite HMR, Prod: Bun server
  const url = process.env.VITE_DEV_SERVER_URL || 'http://localhost:7890';
  win.loadURL(url);

  // IPC for window controls
  ipcMain.on('win:minimize', () => win.minimize());
  ipcMain.on('win:close', () => app.quit());
});
