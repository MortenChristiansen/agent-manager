import { useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { useProjects } from "./hooks/useProjects";
import { ProjectCard } from "./components/ProjectCard";
import { PromptFeed } from "./components/PromptFeed";
import { DeactivationModal } from "./components/DeactivationModal";
import { WindowControls } from "./components/WindowControls";
import type { ProjectWithState } from "../shared/types";

export default function App() {
  const { projects, prompts, connected, currentDesktop } = useWebSocket();
  const { activate, deactivate, switchDesktop, sortProjects } = useProjects();
  const [deactivating, setDeactivating] = useState<ProjectWithState | null>(null);

  const { active, dormant } = sortProjects(projects);

  // Find project matching the current desktop
  const currentProject = projects.find(
    (p) => p.state.status === "active" && p.state.desktopName === currentDesktop
  );

  const handleActivate = async (name: string) => {
    await activate(name);
  };

  const handleDeactivateClick = (name: string) => {
    const project = projects.find((p) => p.name === name);
    if (project) setDeactivating(project);
  };

  const handleDeactivateConfirm = async (stateDescription: string) => {
    if (!deactivating) return;
    await deactivate(deactivating.name, stateDescription);
    setDeactivating(null);
  };

  const handleSwitch = async (name: string) => {
    await switchDesktop(name);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100 overflow-hidden">
      {/* Header */}
      <header style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold tracking-tight">Agent Manager</h1>
          <span
            className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`}
            title={connected ? "Connected" : "Disconnected"}
          />
        </div>
        <WindowControls />
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-4">
          {/* Active projects */}
          {active.length > 0 && (
            <section>
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Active
              </h2>
              <div className="space-y-2">
                {active.map((p) => (
                  <ProjectCard
                    key={p.name}
                    project={p}
                    isCurrent={currentProject?.name === p.name}
                    onActivate={handleActivate}
                    onDeactivate={handleDeactivateClick}
                    onSwitch={handleSwitch}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Dormant projects */}
          {dormant.length > 0 && (
            <section>
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Dormant
              </h2>
              <div className="space-y-2">
                {dormant.map((p) => (
                  <ProjectCard
                    key={p.name}
                    project={p}
                    onActivate={handleActivate}
                    onDeactivate={handleDeactivateClick}
                  />
                ))}
              </div>
            </section>
          )}

          {projects.length === 0 && (
            <div className="text-center py-8 text-gray-600 text-sm">
              No projects configured.
              <br />
              <span className="text-xs">
                Add projects to ~/.agent-manager/config.yaml
              </span>
            </div>
          )}

          {/* Recent Prompts */}
          <section>
            <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
              Recent Prompts
            </h2>
            <PromptFeed prompts={prompts} currentProject={currentProject?.name} />
          </section>
        </div>
      </div>

      {/* Deactivation modal */}
      {deactivating && (
        <DeactivationModal
          project={deactivating}
          onConfirm={handleDeactivateConfirm}
          onCancel={() => setDeactivating(null)}
        />
      )}
    </div>
  );
}
