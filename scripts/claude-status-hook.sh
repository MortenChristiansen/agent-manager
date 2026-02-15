#!/usr/bin/env bash
# Claude Code hook: updates .agent-project/status.json with instance state.
# Called on UserPromptSubmit (→processing) and Stop (→idle).
# Stdin receives JSON with session_id, hook_event_name, prompt, cwd.

set -euo pipefail

INPUT=$(cat)
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id')
CWD=$(echo "$INPUT" | jq -r '.cwd')
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')

DIR="$CWD/.agent-project"
STATUS_FILE="$DIR/status.json"

# Only act if this is a tracked project (dir exists)
[ -d "$DIR" ] || exit 0

case "$EVENT" in
  UserPromptSubmit) STATE="processing" ;;
  Stop)             STATE="idle" ;;
  *)                exit 0 ;;
esac

# Use a lock to avoid concurrent writes
LOCK="/tmp/agent-status-${SESSION_ID}.lock"
exec 9>"$LOCK"
flock -w 2 9 || exit 0

NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Read existing or init
if [ -f "$STATUS_FILE" ]; then
  EXISTING=$(cat "$STATUS_FILE")
else
  EXISTING='{"tabs":[]}'
fi

# Update: upsert entry for this session_id (used as tabName identifier)
UPDATED=$(echo "$EXISTING" | jq --arg sid "$SESSION_ID" --arg state "$STATE" \
  --arg prompt "$PROMPT" --arg now "$NOW" '
  .tabs |= (
    if any(.tabName == $sid) then
      map(if .tabName == $sid then
        .state = $state | .lastActivity = $now |
        (if $state == "processing" and ($prompt | length) > 0 then .lastPrompt = $prompt else . end)
      else . end)
    else
      . + [{"pid": 0, "tabName": $sid, "state": $state, "lastPrompt": $prompt, "lastActivity": $now}]
    end
  )
')

echo "$UPDATED" > "$STATUS_FILE"
exec 9>&-
