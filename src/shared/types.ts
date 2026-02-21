import { z } from "zod";

// --- Config Schema ---

export const TerminalTabSchema = z.object({
  name: z.string(),
  command: z.string().optional().default(""),
});

export const TerminalConfigSchema = z.object({
  profile: z.string().optional(),
  tabs: z.array(TerminalTabSchema).default([]),
});

export const ProjectConfigSchema = z.object({
  path: z.string(),
  description: z.string().optional().default(""),
  color: z.string().default("#6366f1"),
  terminal: TerminalConfigSchema.optional().default({}),
  controlProtocol: z.number().optional(),
});

export const DashboardConfigSchema = z.object({
  port: z.number().default(7890),
  browser: z.enum(["edge", "chrome"]).default("edge"),
  width: z.number().default(380),
  height: z.number().default(900),
  position: z.enum(["left", "right"]).default("right"),
});

export const GlobalConfigSchema = z.object({
  version: z.number().default(1),
  controlProtocol: z.number().default(1),
  openRouterApiKey: z.string().optional(),
  dashboard: DashboardConfigSchema.default({}),
  defaults: z
    .object({
      terminal: z
        .object({
          profile: z.string().default("Ubuntu"),
          shell: z.enum(["zsh", "bash"]).default("zsh"),
        })
        .default({}),
      editor: z.string().default("code"),
    })
    .default({}),
  projects: z.record(z.string(), ProjectConfigSchema).default({}),
});

export type TerminalTab = z.infer<typeof TerminalTabSchema>;
export type TerminalConfig = z.infer<typeof TerminalConfigSchema>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type DashboardConfig = z.infer<typeof DashboardConfigSchema>;
export type GlobalConfig = z.infer<typeof GlobalConfigSchema>;

// --- Per-project runtime state ---

export const ProjectStateSchema = z.object({
  status: z.enum(["active", "activating", "dormant"]).default("dormant"),
  lastActivated: z.string().nullable().default(null),
  lastDeactivated: z.string().nullable().default(null),
  desktopName: z.string().nullable().default(null),
  windowHandles: z.record(z.string(), z.number()).default({}),
  stateDescription: z.string().default(""),
  gitBranch: z.string().default(""),
  gitStatusSummary: z.string().default(""),
});

export type ProjectState = z.infer<typeof ProjectStateSchema>;

// --- History entry ---

export const HistoryEntrySchema = z.object({
  display: z.string(),
  timestamp: z.number(),
  project: z.string().optional(),
  sessionId: z.string().optional(),
});

export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

// --- WebSocket messages ---

export type WSMessage =
  | { type: "projects"; data: ProjectWithState[] }
  | { type: "projectUpdate"; data: ProjectWithState }
  | { type: "prompt"; data: PromptEntry }
  | { type: "prompts"; data: PromptEntry[] }
  | { type: "claudeTabs"; project: string; data: string[] }
  | { type: "currentDesktop"; data: string }
  | { type: "tasks"; project: string; data: string[] };

export interface ProjectWithState {
  name: string;
  config: ProjectConfig;
  state: ProjectState;
  claudeTabs: string[];
}

export interface PromptEntry {
  timestamp: number;
  project: string;
  text: string;
}
