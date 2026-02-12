#!/usr/bin/env bun

import { activate } from "./commands/activate";
import { deactivate } from "./commands/deactivate";
import { status } from "./commands/status";

const SERVER_URL = "http://localhost:7890";

const [command, ...args] = process.argv.slice(2);

async function main() {
  switch (command) {
    case "status":
      await status(SERVER_URL);
      break;
    case "activate":
      if (!args[0]) {
        console.error("Usage: agent-manager activate <project-name>");
        process.exit(1);
      }
      await activate(SERVER_URL, args[0]);
      break;
    case "deactivate":
      if (!args[0]) {
        console.error("Usage: agent-manager deactivate <project-name>");
        process.exit(1);
      }
      await deactivate(SERVER_URL, args[0]);
      break;
    case undefined:
    case "start":
      // Start server + open dashboard
      console.log("Starting Agent Manager server...");
      const proc = Bun.spawn(["bun", "run", "dev"], {
        cwd: import.meta.dir + "/../..",
        stdio: ["inherit", "inherit", "inherit"],
      });
      await proc.exited;
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error(
        "Usage: agent-manager [status|activate|deactivate|start]"
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
