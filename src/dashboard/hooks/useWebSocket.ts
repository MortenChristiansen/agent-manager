import { useEffect, useRef, useCallback, useState } from "react";
import type { WSMessage, ProjectWithState, PromptEntry, TabStatus } from "../../shared/types";

interface UseWebSocketReturn {
  projects: ProjectWithState[];
  prompts: PromptEntry[];
  connected: boolean;
}

export function useWebSocket(): UseWebSocketReturn {
  const [projects, setProjects] = useState<ProjectWithState[]>([]);
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);

        switch (msg.type) {
          case "projects":
            setProjects(msg.data);
            break;

          case "projectUpdate":
            setProjects((prev) =>
              prev.map((p) => (p.name === msg.data.name ? msg.data : p))
            );
            break;

          case "prompt":
            setPrompts((prev) => [msg.data, ...prev].slice(0, 50));
            break;

          case "tabStatus":
            setProjects((prev) =>
              prev.map((p) =>
                p.name === msg.project ? { ...p, tabs: msg.data } : p
              )
            );
            break;
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  return { projects, prompts, connected };
}
