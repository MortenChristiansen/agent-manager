#!/usr/bin/env bash
# Install agent-manager hooks into Claude Code's ~/.claude/settings.json.
# Idempotent — safe to run multiple times.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK_SCRIPT="$SCRIPT_DIR/claude-status-hook.sh"
SETTINGS="$HOME/.claude/settings.json"

if ! command -v jq &>/dev/null; then
  echo "error: jq is required. Install with: sudo apt install jq" >&2
  exit 1
fi

if [ ! -f "$HOOK_SCRIPT" ]; then
  echo "error: hook script not found at $HOOK_SCRIPT" >&2
  exit 1
fi

chmod +x "$HOOK_SCRIPT"

mkdir -p "$(dirname "$SETTINGS")"
if [ ! -f "$SETTINGS" ]; then
  echo '{}' > "$SETTINGS"
fi

EXISTING=$(cat "$SETTINGS")

# Check if hook is already installed
if echo "$EXISTING" | jq -e --arg cmd "$HOOK_SCRIPT" '
  .hooks.UserPromptSubmit // [] | any(
    .hooks // [] | any(.command == $cmd)
  )' >/dev/null 2>&1; then
  echo "hooks already installed in $SETTINGS"
  exit 0
fi

# Add hook command to an event's first hook group, creating structure if needed
add_hook() {
  local event="$1"
  local json="$2"
  echo "$json" | jq --arg event "$event" --arg cmd "$HOOK_SCRIPT" '
    .hooks //= {} |
    .hooks[$event] //= [{"hooks": []}] |
    .hooks[$event][0].hooks += [{"type": "command", "command": $cmd}]
  '
}

UPDATED=$(add_hook "UserPromptSubmit" "$EXISTING")
UPDATED=$(add_hook "Stop" "$UPDATED")

echo "$UPDATED" > "$SETTINGS"
echo "installed hooks into $SETTINGS"
echo "  UserPromptSubmit → $HOOK_SCRIPT"
echo "  Stop             → $HOOK_SCRIPT"
