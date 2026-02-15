import { existsSync } from "fs";
import { basename } from "path";
import { loadConfig, saveConfig } from "../config";
import {
  buildProjectsWithState,
  loadProjectState,
  saveProjectState,
  setProjectStatus,
  loadTasks,
  saveTasks,
} from "../state";
import { broadcast } from "./websocket";
import { closeWindowsOnDesktop, createDesktop, removeDesktop, switchToDesktop } from "../desktop";
import { launchTerminal } from "../terminal";
import { registerProjectWatcher } from "../projectRegistry";
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

  // POST /api/projects - add new project
  if (path === "/api/projects" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      path?: string;
      description?: string;
      color?: string;
    };

    if (!body.path) {
      return Response.json({ error: "path is required" }, { status: 400 });
    }

    // Convert Windows UNC WSL path to Linux path
    // e.g. \\wsl.localhost\Ubuntu-24.04\home\user\code → /home/user/code
    let projectPath = body.path.trim();
    const wslMatch = projectPath.match(/^\\\\wsl[\.\$\\].*?\\[^\\]+\\(.*)/i);
    if (wslMatch) {
      projectPath = "/" + wslMatch[1].replace(/\\/g, "/");
    }

    if (!existsSync(projectPath)) {
      return Response.json({ error: "Path does not exist" }, { status: 400 });
    }

    const name = body.name || basename(projectPath);
    const config = loadConfig();

    if (config.projects[name]) {
      return Response.json({ error: "Project name already exists" }, { status: 409 });
    }

    config.projects[name] = {
      path: projectPath,
      description: body.description ?? "",
      color: body.color ?? "#6366f1",
      terminal: { tabs: [] },
    };
    saveConfig(config);

    registerProjectWatcher(name, projectPath);

    const projects = buildProjectsWithState(config);
    broadcast({ type: "projects", data: projects });

    return Response.json({ ok: true, name });
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
    const projectConfig = config.projects[name];
    if (!projectConfig) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Broadcast activating state immediately so UI shows loading
    setProjectStatus(name, "activating");
    const earlyState = loadProjectState(name);
    earlyState.desktopName = name;
    saveProjectState(name, earlyState);
    broadcast({ type: "projects", data: buildProjectsWithState(config) });

    createDesktop(name);
    switchToDesktop(name);
    // brief pause so Windows settles on the new desktop before spawning the terminal
    await new Promise((r) => setTimeout(r, 500));
    const terminalPid = await launchTerminal({
      projectName: name,
      wslPath: projectConfig.path,
      profile: projectConfig.terminal?.profile ?? config.defaults.terminal.profile,
      shell: config.defaults.terminal.shell,
      tabs: projectConfig.terminal?.tabs,
    });

    setProjectStatus(name, "active");
    const state = loadProjectState(name);
    state.lastActivated = new Date().toISOString();
    state.desktopName = name;
    if (terminalPid) state.windowHandles = { terminal: terminalPid };
    saveProjectState(name, state);

    const projects = buildProjectsWithState(config);
    broadcast({ type: "projects", data: projects });

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

    setProjectStatus(name, "dormant");
    const state = loadProjectState(name);
    closeWindowsOnDesktop(name);
    switchToDesktop("0");
    removeDesktop(name);

    state.lastDeactivated = new Date().toISOString();
    state.desktopName = null;
    state.windowHandles = {};
    if (body.stateDescription !== undefined) {
      state.stateDescription = body.stateDescription;
    }
    saveProjectState(name, state);

    const projects = buildProjectsWithState(config);
    broadcast({ type: "projects", data: projects });

    return Response.json({ ok: true, state });
  }

  // POST /api/projects/:name/switch
  if (path.match(/^\/api\/projects\/[^/]+\/switch$/) && req.method === "POST") {
    const name = path.split("/")[3];
    const config = loadConfig();
    if (!config.projects[name]) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    const state = loadProjectState(name);
    if (!state.desktopName) {
      return Response.json({ error: "Project has no desktop" }, { status: 400 });
    }
    switchToDesktop(state.desktopName);
    return Response.json({ ok: true });
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

  // POST /api/desktop/home - switch to desktop 0
  if (path === "/api/desktop/home" && req.method === "POST") {
    switchToDesktop("0");
    return Response.json({ ok: true });
  }

  // GET /api/config
  if (path === "/api/config" && req.method === "GET") {
    const config = loadConfig();
    return Response.json({
      dashboard: config.dashboard,
      controlProtocol: config.controlProtocol,
    });
  }

  // GET /api/projects/:name/tasks
  if (path.match(/^\/api\/projects\/[^/]+\/tasks$/) && req.method === "GET") {
    const name = path.split("/")[3];
    const config = loadConfig();
    const projectConfig = config.projects[name];
    if (!projectConfig) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    return Response.json(loadTasks(projectConfig.path));
  }

  // POST /api/projects/:name/tasks - add task
  if (path.match(/^\/api\/projects\/[^/]+\/tasks$/) && req.method === "POST") {
    const name = path.split("/")[3];
    const config = loadConfig();
    const projectConfig = config.projects[name];
    if (!projectConfig) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    const body = (await req.json().catch(() => ({}))) as { task?: string };
    if (!body.task?.trim()) {
      return Response.json({ error: "task is required" }, { status: 400 });
    }
    const tasks = loadTasks(projectConfig.path);
    tasks.push(body.task.trim());
    saveTasks(projectConfig.path, tasks);
    broadcast({ type: "tasks", project: name, data: tasks });
    return Response.json({ ok: true, tasks });
  }

  // DELETE /api/projects/:name/tasks/:index
  if (path.match(/^\/api\/projects\/[^/]+\/tasks\/\d+$/) && req.method === "DELETE") {
    const parts = path.split("/");
    const name = parts[3];
    const index = parseInt(parts[5], 10);
    const config = loadConfig();
    const projectConfig = config.projects[name];
    if (!projectConfig) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    const tasks = loadTasks(projectConfig.path);
    if (index < 0 || index >= tasks.length) {
      return Response.json({ error: "Invalid index" }, { status: 400 });
    }
    tasks.splice(index, 1);
    saveTasks(projectConfig.path, tasks);
    broadcast({ type: "tasks", project: name, data: tasks });
    return Response.json({ ok: true, tasks });
  }

  // PUT /api/projects/:name/tasks - reorder/replace tasks
  if (path.match(/^\/api\/projects\/[^/]+\/tasks$/) && req.method === "PUT") {
    const name = path.split("/")[3];
    const config = loadConfig();
    const projectConfig = config.projects[name];
    if (!projectConfig) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }
    const body = (await req.json().catch(() => ({}))) as { tasks?: string[] };
    if (!Array.isArray(body.tasks)) {
      return Response.json({ error: "tasks array required" }, { status: 400 });
    }
    saveTasks(projectConfig.path, body.tasks);
    broadcast({ type: "tasks", project: name, data: body.tasks });
    return Response.json({ ok: true, tasks: body.tasks });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}
