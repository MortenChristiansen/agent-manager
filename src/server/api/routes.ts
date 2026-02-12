import { loadConfig } from "../config";
import {
  buildProjectsWithState,
  loadProjectState,
  saveProjectState,
} from "../state";
import type { ProjectState } from "../../shared/types";

export async function handleApiRequest(
  req: Request,
  url: URL
): Promise<Response> {
  const path = url.pathname;

  // GET /api/projects - list all projects with state
  if (path === "/api/projects" && req.method === "GET") {
    const config = loadConfig();
    const projects = buildProjectsWithState(config);
    return Response.json(projects);
  }

  // GET /api/projects/:name - single project
  if (path.startsWith("/api/projects/") && req.method === "GET") {
    const name = path.split("/")[3];
    const config = loadConfig();
    const projectConfig = config.projects[name];
    if (!projectConfig) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    const state = loadProjectState(name);
    return Response.json({ name, config: projectConfig, state });
  }

  // POST /api/projects/:name/activate
  if (path.match(/^\/api\/projects\/[^/]+\/activate$/) && req.method === "POST") {
    const name = path.split("/")[3];
    const config = loadConfig();
    if (!config.projects[name]) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    // Phase 1: just update state, Phase 2 will add desktop/terminal/editor launch
    const state = loadProjectState(name);
    state.status = "active";
    state.lastActivated = new Date().toISOString();
    saveProjectState(name, state);
    return Response.json({ ok: true, state });
  }

  // POST /api/projects/:name/deactivate
  if (path.match(/^\/api\/projects\/[^/]+\/deactivate$/) && req.method === "POST") {
    const name = path.split("/")[3];
    const config = loadConfig();
    if (!config.projects[name]) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      stateDescription?: string;
    };

    const state = loadProjectState(name);
    state.status = "dormant";
    state.lastDeactivated = new Date().toISOString();
    state.desktopIndex = null;
    state.windowHandles = {};
    if (body.stateDescription !== undefined) {
      state.stateDescription = body.stateDescription;
    }
    saveProjectState(name, state);
    return Response.json({ ok: true, state });
  }

  // PATCH /api/projects/:name/state - update state description etc
  if (path.match(/^\/api\/projects\/[^/]+\/state$/) && req.method === "PATCH") {
    const name = path.split("/")[3];
    const body = (await req.json().catch(() => ({}))) as Partial<ProjectState>;
    const state = loadProjectState(name);
    Object.assign(state, body);
    saveProjectState(name, state);
    return Response.json({ ok: true, state });
  }

  // GET /api/config
  if (path === "/api/config" && req.method === "GET") {
    const config = loadConfig();
    return Response.json({
      dashboard: config.dashboard,
      controlProtocol: config.controlProtocol,
    });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}
