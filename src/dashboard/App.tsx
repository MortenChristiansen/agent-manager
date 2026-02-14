import { useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { useProjects } from "./hooks/useProjects";
import { ProjectCard } from "./components/ProjectCard";
import { PromptFeed } from "./components/PromptFeed";
import { DeactivationModal } from "./components/DeactivationModal";
import { AddProjectModal } from "./components/AddProjectModal";
import { WindowControls } from "./components/WindowControls";
import type { ProjectWithState } from "../shared/types";

export default function App() {
  const { projects, prompts, connected, currentDesktop } = useWebSocket();
  const { activate, deactivate, switchDesktop, addProject, sortProjects } = useProjects();
  const [deactivating, setDeactivating] = useState<ProjectWithState | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);

  const { active, dormant } = sortProjects(projects);

  // Find project matching the current virtual desktop
  const currentProject = projects.find(
    (p) => p.state.desktopName && p.state.desktopName === currentDesktop
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

  const handleAddProject = async (data: { name: string; path: string; color: string; description: string }) => {
    const res = await addProject(data);
    if (res.error) {
      alert(res.error);
      return;
    }
    setShowAddProject(false);
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
          <button
            onClick={() => setShowAddProject(true)}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="w-5 h-5 flex items-center justify-center rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 text-xs transition-colors"
            title="Add project"
          >
            +
          </button>
        </div>
        <WindowControls />
      </header>

      {/* Projects */}
      <div className="overflow-y-auto shrink-0 max-h-[50%]">
        <div className="p-3 space-y-4">
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

          {dormant.length > 0 && (
            <section>
              <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Inactive
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
        </div>
      </div>

      {/* Recent Prompts — only shown when viewing a project */}
      {currentProject && (
        <section className="flex-1 min-h-0 flex flex-col border-t border-gray-800">
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-3 pt-3 pb-2 shrink-0">
            Recent Prompts
          </h2>
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            <PromptFeed prompts={prompts} currentProject={currentProject.name} />
          </div>
        </section>
      )}

      {/* Deactivation modal */}
      {deactivating && (
        <DeactivationModal
          project={deactivating}
          onConfirm={handleDeactivateConfirm}
          onCancel={() => setDeactivating(null)}
        />
      )}

      {/* Add project modal */}
      {showAddProject && (
        <AddProjectModal
          onSubmit={handleAddProject}
          onCancel={() => setShowAddProject(false)}
        />
      )}
    </div>
  );
}
