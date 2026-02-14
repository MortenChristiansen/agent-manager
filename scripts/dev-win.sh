#!/bin/bash
set -e

WIN_USER=$(powershell.exe -NoProfile -Command '[System.Environment]::UserName' | tr -d '\r')
WIN_DIR="/mnt/c/Users/${WIN_USER}/.agent-manager-dev"
WIN_PATH="C:\\Users\\${WIN_USER}\\.agent-manager-dev"

mkdir -p "$WIN_DIR/out/main" "$WIN_DIR/out/preload"

# Build electron main/preload
echo "[dev-win] Building electron main/preload..."
bunx electron-vite build

# Sync compiled artifacts
rsync -a --delete out/main/ "$WIN_DIR/out/main/"
rsync -a --delete out/preload/ "$WIN_DIR/out/preload/"
cp package.json "$WIN_DIR/"

# One-time: install electron on Windows side
if [ ! -d "$WIN_DIR/node_modules/electron" ]; then
  echo "[dev-win] First run: installing Electron on Windows..."
  powershell.exe -NoProfile -Command "cd '$WIN_PATH'; npm install --save-dev electron"
fi

# Start backend server and Vite dev server in background
echo "[dev-win] Starting backend server..."
bun --watch src/server/index.ts &
SERVER_PID=$!

echo "[dev-win] Starting Vite dev server..."
bunx vite &
VITE_PID=$!

cleanup() { kill $SERVER_PID $VITE_PID 2>/dev/null; wait $SERVER_PID $VITE_PID 2>/dev/null; exit 0; }
trap cleanup EXIT

# Wait for both to be ready
echo "[dev-win] Waiting for servers..."
while ! curl -s http://localhost:7890 > /dev/null 2>&1; do sleep 0.5; done
while ! curl -s http://localhost:5173 > /dev/null 2>&1; do sleep 0.5; done

# Launch Electron on Windows with user-data-dir to avoid cache permission errors
echo "[dev-win] Launching Electron on Windows..."
powershell.exe -NoProfile -Command "cd '$WIN_PATH'; \$env:VITE_DEV_SERVER_URL='http://localhost:5173'; npx electron . --user-data-dir='$WIN_PATH/electron-data'"
