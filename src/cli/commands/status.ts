import type { ProjectWithState } from "../../shared/types";

export async function status(serverUrl: string) {
  try {
    const res = await fetch(`${serverUrl}/api/projects`);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    const projects: ProjectWithState[] = await res.json();

    if (projects.length === 0) {
      console.log("No projects configured.");
      return;
    }

    const active = projects.filter((p) => p.state.status === "active");
    const dormant = projects.filter((p) => p.state.status === "dormant");

    if (active.length > 0) {
      console.log("\n\x1b[32mACTIVE\x1b[0m");
      for (const p of active) {
        const branch = p.state.gitBranch ? ` (${p.state.gitBranch})` : "";
        const git = p.state.gitStatusSummary ? ` [${p.state.gitStatusSummary}]` : "";
        console.log(`  ${p.name}${branch}${git}`);
        if (p.state.stateDescription) {
          console.log(`    "${p.state.stateDescription}"`);
        }
      }
    }

    if (dormant.length > 0) {
      console.log("\n\x1b[90mDORMANT\x1b[0m");
      for (const p of dormant) {
        console.log(`  ${p.name}`);
        if (p.state.stateDescription) {
          console.log(`    "${p.state.stateDescription}"`);
        }
      }
    }

    console.log();
  } catch (e: any) {
    console.error(`Cannot connect to server at ${serverUrl}`);
    console.error("Start the server with: agent-manager start");
    process.exit(1);
  }
}
