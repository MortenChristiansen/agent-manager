import { useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { useProjects } from "./hooks/useProjects";
import { ProjectCard } from "./components/ProjectCard";
import { PromptFeed } from "./components/PromptFeed";
import { TaskList } from "./components/TaskList";
import { DeactivationModal } from "./components/DeactivationModal";
import { ProjectFormModal } from "./components/ProjectFormModal";
import type { ProjectFormData } from "./components/ProjectFormModal";
import { WindowControls } from "./components/WindowControls";
import type { ProjectWithState } from "../shared/types";

export default function App() {
  const { projects, prompts, connected, currentDesktop, tasks } = useWebSocket();
  const { activate, deactivate, switchDesktop, goHome, addProject, updateProject, deleteProject, sortProjects } = useProjects();
  const [deactivating, setDeactivating] = useState<ProjectWithState | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [editing, setEditing] = useState<ProjectWithState | null>(null);
  const [bottomTab, setBottomTab] = useState<"prompts" | "tasks">("prompts");

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

  const handleAddProject = async (data: ProjectFormData) => {
    const res = await addProject({
      name: data.name,
      path: data.path,
      color: data.color,
      description: data.description,
      terminal: data.terminal,
    });
    if (res.error) {
      alert(res.error);
      return;
    }
    setShowAddProject(false);
  };

  const handleEditProject = async (data: ProjectFormData) => {
    const res = await updateProject(data.name, {
      color: data.color,
      description: data.description,
      terminal: data.terminal,
      controlProtocol: data.controlProtocol,
    });
    if (res.error) {
      alert(res.error);
      return;
    }
    setEditing(null);
  };

  const handleDeleteProject = async () => {
    if (!editing) return;
    const res = await deleteProject(editing.name);
    if (res.error) {
      alert(res.error);
      return;
    }
    setEditing(null);
  };

  const handleEdit = (name: string) => {
    const project = projects.find((p) => p.name === name);
    if (project) setEditing(project);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100 overflow-hidden">
      {/* Header */}
      <header style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold tracking-tight">Agent Manager</h1>
          {location.port === "5891" && (
            <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">DEV</span>
          )}
          <span
            className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`}
            title={connected ? "Connected" : "Disconnected"}
          />
          <button
            onClick={goHome}
            disabled={!currentProject}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="w-5 h-5 flex items-center justify-center rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 text-xs transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Go to primary desktop"
          >
            &#8962;
          </button>
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
      <div className="flex-1 overflow-y-auto min-h-0">
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
                    onEdit={handleEdit}
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
                    onEdit={handleEdit}
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

      {/* Bottom panel — only shown when viewing a project */}
      {currentProject && (
        <section className="max-h-[25%] min-h-0 flex flex-col border-t border-gray-800">
          <div className="flex gap-3 px-3 pt-2 pb-1 shrink-0">
            <button
              onClick={() => setBottomTab("prompts")}
              className={`text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                bottomTab === "prompts" ? "text-gray-300" : "text-gray-600 hover:text-gray-400"
              }`}
            >
              Prompts
            </button>
            <button
              onClick={() => setBottomTab("tasks")}
              className={`text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                bottomTab === "tasks" ? "text-gray-300" : "text-gray-600 hover:text-gray-400"
              }`}
            >
              Tasks
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {bottomTab === "prompts" ? (
              <PromptFeed prompts={prompts} currentProject={currentProject.name} />
            ) : (
              <TaskList
                tasks={tasks.get(currentProject.name) ?? []}
                projectName={currentProject.name}
              />
            )}
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
        <ProjectFormModal
          mode="add"
          onSubmit={handleAddProject}
          onCancel={() => setShowAddProject(false)}
        />
      )}

      {/* Edit project modal */}
      {editing && (
        <ProjectFormModal
          mode="edit"
          project={editing}
          onSubmit={handleEditProject}
          onDelete={handleDeleteProject}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
