import { useCallback } from "react";
import type { ProjectWithState } from "../../shared/types";

export function useProjects() {
  const activate = useCallback(async (name: string) => {
    const res = await fetch(`/api/projects/${name}/activate`, {
      method: "POST",
    });
    return res.json();
  }, []);

  const deactivate = useCallback(
    async (name: string, stateDescription?: string) => {
      const res = await fetch(`/api/projects/${name}/deactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stateDescription }),
      });
      return res.json();
    },
    []
  );

  const updateState = useCallback(
    async (name: string, updates: Record<string, any>) => {
      const res = await fetch(`/api/projects/${name}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      return res.json();
    },
    []
  );

  const sortProjects = useCallback((projects: ProjectWithState[]) => {
    const active = projects.filter((p) => p.state.status === "active");
    const dormant = projects.filter((p) => p.state.status === "dormant");
    return { active, dormant };
  }, []);

  return { activate, deactivate, updateState, sortProjects };
}
