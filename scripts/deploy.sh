#!/bin/bash
set -e

WIN_USER=$(powershell.exe -NoProfile -Command '[System.Environment]::UserName' | tr -d '\r')
WIN_DIR="/mnt/c/Users/${WIN_USER}/.agent-manager"
WIN_PATH="C:\\Users\\${WIN_USER}\\.agent-manager"

echo "[deploy] Building dashboard..."
bunx vite build

echo "[deploy] Building server..."
bun build src/server/index.ts --outdir dist/server --target bun

echo "[deploy] Building electron..."
bunx electron-vite build

echo "[deploy] Syncing to ${WIN_DIR}..."
mkdir -p "$WIN_DIR/out/main" "$WIN_DIR/out/preload" "$WIN_DIR/dist/dashboard" "$WIN_DIR/dist/server" "$WIN_DIR/resources"

rsync -a --delete out/main/ "$WIN_DIR/out/main/"
rsync -a --delete out/preload/ "$WIN_DIR/out/preload/"
rsync -a --delete dist/dashboard/ "$WIN_DIR/dist/dashboard/"
rsync -a --delete dist/server/ "$WIN_DIR/dist/server/"
rsync -a --delete resources/ "$WIN_DIR/resources/"
cp package.json "$WIN_DIR/"

# Install electron on Windows side if missing
if [ ! -d "$WIN_DIR/node_modules/electron" ]; then
  echo "[deploy] Installing Electron on Windows..."
  powershell.exe -NoProfile -Command "cd '$WIN_PATH'; npm install --save-dev electron"
fi

# Create desktop shortcut
echo "[deploy] Creating desktop shortcut..."
powershell.exe -NoProfile -Command "
  \$ws = New-Object -ComObject WScript.Shell
  \$desktop = \$ws.SpecialFolders('Desktop')
  \$lnk = \$ws.CreateShortcut(\"\$desktop\\Agent Manager.lnk\")
  \$lnk.TargetPath = '$WIN_PATH\\node_modules\\electron\\dist\\electron.exe'
  \$lnk.Arguments = '. --user-data-dir=electron-data'
  \$lnk.WorkingDirectory = '$WIN_PATH'
  \$lnk.IconLocation = '$WIN_PATH\\resources\\icon.ico'
  \$lnk.Save()
"

echo "[deploy] Done. Shortcut created on Desktop."
