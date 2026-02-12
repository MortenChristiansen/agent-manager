import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import YAML from "yaml";
import { GlobalConfigSchema, type GlobalConfig } from "../shared/types";
import { AGENT_MANAGER_DIR, CONFIG_PATH, STATE_DIR } from "../shared/paths";

const DEFAULT_CONFIG = `version: 1
controlProtocol: 1

dashboard:
  port: 7890
  browser: edge
  width: 380
  height: 900
  position: right

defaults:
  terminal:
    profile: "Ubuntu"
  editor: code

projects: {}
`;

export function ensureDirs() {
  mkdirSync(AGENT_MANAGER_DIR, { recursive: true });
  mkdirSync(STATE_DIR, { recursive: true });
}

export function loadConfig(): GlobalConfig {
  ensureDirs();

  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(CONFIG_PATH, DEFAULT_CONFIG, "utf-8");
  }

  const raw = readFileSync(CONFIG_PATH, "utf-8");
  const parsed = YAML.parse(raw) ?? {};
  return GlobalConfigSchema.parse(parsed);
}

export function saveConfig(config: GlobalConfig) {
  ensureDirs();
  writeFileSync(CONFIG_PATH, YAML.stringify(config), "utf-8");
}
