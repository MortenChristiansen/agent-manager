# Agent Manager

Central dashboard for orchestrating multiple Claude Code project workspaces on isolated Windows virtual desktops from WSL.

## Problem

Working on 6+ projects simultaneously with Claude Code means juggling terminal tabs, VS Code windows, git contexts, and Claude sessions per project. Context-switching is expensive and there's no unified view of what's happening across projects.

## Solution

Agent Manager provides:

- **Project activation/deactivation** — spin up a full workspace (virtual desktop, terminal tabs, VS Code, GitKraken) with one click, tear it down when done
- **Real-time dashboard** — see all projects, their git status, per-tab Claude Code activity (processing/idle/inactive), and recent prompts in a sidebar pinned across all desktops
- **Color-coded virtual desktops** — each project gets a desktop with a wallpaper tinted to its configured color for instant visual recognition in Task View
- **State persistence** — deactivation captures where you left off (AI-generated or manual description), so you can resume days later with full context
- **Sound notifications** — audible alert when Claude Code finishes processing in any project
- **Control protocol sync** — shared skills, hooks, and templates pushed to all projects from a central store

## Architecture

Everything runs in WSL. The dashboard is served on `localhost:7890` and opened as a frameless Chrome/Edge `--app` window pinned across all virtual desktops. All Windows operations (virtual desktops, window management, wallpapers) go through PowerShell commands bridged from WSL.

```
┌─────────────────────────────────────────────┐
│  WSL (Bun + TypeScript)                     │
│                                             │
│  HTTP server (:7890)  ←→  React dashboard   │
│  WebSocket            ←→  real-time updates │
│  File watchers        ←   .agent-project/   │
│  Git polling          ←   project repos     │
│  History tail         ←   ~/.claude/        │
│                                             │
│  PowerShell bridge    →   Windows APIs      │
│    • PSVirtualDesktop (desktops)            │
│    • wt.exe (terminal)                      │
│    • code (VS Code)                         │
│    • gitkraken.exe                          │
└─────────────────────────────────────────────┘
```

## Prerequisites

- **WSL 2** with Ubuntu (tested on 24.04)
- **Bun** — `curl -fsSL https://bun.sh/install | bash`
- **jq** — `sudo apt install jq` (used by status hook)
- **Claude Code** — `npm install -g @anthropic-ai/claude-code`
- **Windows Terminal** with a WSL profile (e.g. "Ubuntu")
- **Node/npm on Windows** (for Electron install during deploy)
- **VirtualDesktop11.exe** — [github.com/MScholtes/VirtualDesktop](https://github.com/MScholtes/VirtualDesktop), place in `C:\Users\<you>\.agent-manager\tools\` (optional, for desktop switching)

## Setup

```bash
git clone <repo-url> ~/code/agent-manager
cd ~/code/agent-manager
bun install
```

### Install Claude Code hooks

Registers the status hook in `~/.claude/settings.json` so the dashboard can track which Claude instances are processing/idle:

```bash
bun run setup:hooks
```

This is idempotent — safe to re-run after pulling updates.

### Global config

First server start auto-creates `~/.agent-manager/config.yaml` with defaults. Edit to add projects:

```yaml
version: 1
controlProtocol: 3

openRouterApiKey: "sk-or-..."  # optional, for AI state descriptions

dashboard:
  port: 7890
  browser: edge        # edge | chrome
  width: 380
  height: 900
  position: right

defaults:
  terminal:
    profile: "Ubuntu"
  editor: code

projects:
  my-project:
    path: /home/user/code/my-project
    description: "Short description"
    color: "#dd0531"
    terminal:
      tabs:
        - name: dev
          command: "bun run dev"
        - name: claude
          command: ""       # empty = plain shell
    controlProtocol: 3
```

## Usage

### Start server + dashboard

```bash
bun run dev          # dev mode (hot reload)
bun run start        # production
```

### CLI

```bash
bun run cli status              # list all projects and states
bun run cli activate <name>     # activate a project workspace
bun run cli deactivate <name>   # deactivate a project workspace
```

### Dashboard

Sidebar app showing:

| Section | Content |
|---------|---------|
| **Active projects** | Color bar, git branch + status (`2M 1U`), per-tab Claude Code state (processing/idle/inactive with elapsed time), state description |
| **Dormant projects** | State description from last deactivation, play button to activate |
| **Recent prompts** | Tailed from `~/.claude/history.jsonl`, shows timestamp + project + prompt text |

## Project Activation Flow

1. Create Windows virtual desktop (PSVirtualDesktop)
2. Set color-coded wallpaper on the new desktop
3. Switch to the desktop
4. Launch Windows Terminal with all configured tabs at project path
5. Launch VS Code (Remote WSL)
6. Launch GitKraken (pinned across all desktops)
7. Capture window handles for later cleanup
8. Update state to `active`, start git polling

## Project Deactivation Flow

1. Check for active Claude Code sessions — warn if any tab is still processing
2. Prompt for state description (pre-populated with AI summary if OpenRouter key configured)
3. Close VS Code and Windows Terminal via stored window handles
4. Remove virtual desktop
5. Update state to `dormant`, save description

## Claude Code Integration

Each managed project gets a `.agent-project/` directory (gitignored) containing:

- `status.json` — per-tab Claude Code state, written by hooks on prompt submit and response completion
- `hooks/` — Claude Code hooks installed by agent-manager

The agent-manager polls `status.json` across all tracked projects (fs.watch unreliable on WSL2) and pushes changes to the dashboard over WebSocket. Stale idle entries (>60s) are automatically filtered out.

Tab states:
- **Processing** — hook reported prompt submitted, no completion yet
- **Idle** — hook reported response complete
- **Inactive** — no Claude process detected for this tab

A sound notification fires on any processing → idle transition.

## Control Protocol Sync

Central skill/template store at `~/.agent-manager/protocol/`:

```
protocol/
  version
  skills/          # shared Claude Code skills
  templates/       # AGENTS.md, .vscode/settings.json, etc.
  hooks/           # on-prompt-submit.sh, on-response-complete.sh
```

`bun run cli sync <name>` or `sync --all` copies shared skills and hooks to each project, with template interpolation for project-specific values. Auto-syncs on activate if project version is behind global version.

## Implementation Phases

| Phase | Status | Scope |
|-------|--------|-------|
| 1 — Core | ✅ | Config, server, WebSocket, watchers, git polling, dashboard |
| 2 — Desktop Management | Planned | Virtual desktops, wallpapers, WT/VS Code/GitKraken launch, window pinning |
| 3 — Intelligence | Planned | Sound notifications, AI state descriptions, active-tab warnings |
| 4 — Protocol Sync | Planned | Skill store, templates, hook install, sync command, project init |

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Bun + TypeScript |
| Backend | Bun HTTP server + native WebSocket |
| Frontend | React + Vite + Tailwind CSS v4 |
| Config | YAML + Zod validation |
| AI | OpenRouter via AI SDK |
| Windows integration | PowerShell from WSL |
| Virtual desktops | VirtualDesktop11.exe |
| Terminal | Windows Terminal CLI (`wt.exe`) |

## External state

| Location | Purpose | Created by |
|---|---|---|
| `~/.agent-manager/config.yaml` | Project definitions, dashboard settings | Auto (first server start) |
| `~/.agent-manager/state/` | Per-project runtime state | Auto |
| `~/.claude/settings.json` | Claude Code hooks | `bun run setup:hooks` |
| `<project>/.agent-project/` | Per-project Claude instance status | Auto (server start) |
| `C:\Users\<you>\.agent-manager\` | Electron app, built assets | `bun run deploy` |
