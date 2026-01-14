type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
type MessageHandler = (data: string) => void;
type StatusHandler = (status: ConnectionStatus, message: string) => void;

interface TerminalConnectionState {
  ws: WebSocket | null;
  status: ConnectionStatus;
  statusMessage: string;
  sessionId: string | null;
  messageHandlers: Set<MessageHandler>;
  statusHandlers: Set<StatusHandler>;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  outputBuffer: string[];
}

// Store connection state in globalThis to survive HMR
const GLOBAL_KEY = "__VIMUX_TERMINAL_CONNECTION__";

function getGlobalState(): TerminalConnectionState {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: TerminalConnectionState };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      ws: null,
      status: "disconnected",
      statusMessage: "",
      sessionId: null,
      messageHandlers: new Set(),
      statusHandlers: new Set(),
      reconnectTimer: null,
      heartbeatTimer: null,
      outputBuffer: [],
    };
  }
  return g[GLOBAL_KEY];
}

const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "wss://api.vimux.dev/ws";

function updateStatus(status: ConnectionStatus, message: string): void {
  const state = getGlobalState();
  state.status = status;
  state.statusMessage = message;
  state.statusHandlers.forEach(handler => handler(status, message));
}

function startHeartbeat(): void {
  stopHeartbeat();
  const state = getGlobalState();
  state.heartbeatTimer = setInterval(() => {
    if (state.ws?.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type: "ping" }));
    }
  }, 30000);
}

function stopHeartbeat(): void {
  const state = getGlobalState();
  if (state.heartbeatTimer) {
    clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = null;
  }
}

function scheduleReconnect(): void {
  const state = getGlobalState();
  if (state.reconnectTimer) return;
  
  updateStatus("disconnected", "Reconnecting in 5 seconds...");
  state.reconnectTimer = setTimeout(() => {
    state.reconnectTimer = null;
    connect();
  }, 5000);
}

function cleanup(): void {
  const state = getGlobalState();
  stopHeartbeat();
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
}

export function connect(): void {
  const state = getGlobalState();
  
  if (state.ws?.readyState === WebSocket.OPEN || state.ws?.readyState === WebSocket.CONNECTING) {
    console.log("Already connected/connecting, skipping");
    return;
  }

  console.log("Creating new WebSocket connection");
  updateStatus("connecting", "Connecting to terminal server...");

  const ws = new WebSocket(wsUrl);
  state.ws = ws;

  ws.onopen = () => {
    console.log("WebSocket connected");
    updateStatus("connecting", "Starting terminal...");
    startHeartbeat();
  };

  ws.onmessage = (event) => {
    const state = getGlobalState();
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case "session":
          state.sessionId = message.id;
          console.log("Session ID:", message.id);
          break;

        case "status":
          updateStatus("connecting", message.message);
          break;

        case "ready":
          updateStatus("connected", "");
          break;

        case "output":
          if (state.messageHandlers.size > 0) {
            state.messageHandlers.forEach(handler => handler(message.data));
          } else {
            // Buffer output if no handlers yet (component not mounted)
            state.outputBuffer.push(message.data);
            // Keep buffer from growing too large
            if (state.outputBuffer.length > 1000) {
              state.outputBuffer.shift();
            }
          }
          break;

        case "error":
          updateStatus("error", message.message);
          break;

        case "timeout":
          updateStatus("disconnected", message.message);
          cleanup();
          break;

        case "shutdown":
          updateStatus("disconnected", "Server is restarting...");
          scheduleReconnect();
          break;

        case "pong":
          break;
      }
    } catch (error) {
      console.error("Failed to parse message:", error);
    }
  };

  ws.onerror = () => {
    console.log("WebSocket error");
    updateStatus("error", "Connection error");
  };

  ws.onclose = (event) => {
    const state = getGlobalState();
    console.log("WebSocket closed:", event.code, event.reason);
    stopHeartbeat();
    state.ws = null;
    
    if (event.code !== 1000 && event.code !== 1001) {
      scheduleReconnect();
    } else {
      updateStatus("disconnected", "Disconnected");
    }
  };
}

export function sendInput(data: string): void {
  const state = getGlobalState();
  if (state.ws?.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: "input", data }));
  } else {
    console.warn("sendInput failed: WebSocket not open, state:", state.ws?.readyState);
  }
}

export function sendResize(cols: number, rows: number): void {
  const state = getGlobalState();
  if (state.ws?.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: "resize", cols, rows }));
  }
}

export function onMessage(handler: MessageHandler): () => void {
  const state = getGlobalState();
  state.messageHandlers.add(handler);
  
  // Flush any buffered output to this handler
  if (state.outputBuffer.length > 0) {
    const buffered = state.outputBuffer.join("");
    state.outputBuffer = [];
    // Use setTimeout to ensure handler is ready
    setTimeout(() => handler(buffered), 0);
  }
  
  return () => state.messageHandlers.delete(handler);
}

export function onStatus(handler: StatusHandler): () => void {
  const state = getGlobalState();
  state.statusHandlers.add(handler);
  // Immediately call with current status
  handler(state.status, state.statusMessage);
  return () => state.statusHandlers.delete(handler);
}

export function getStatus(): ConnectionStatus {
  return getGlobalState().status;
}

export function isConnected(): boolean {
  const state = getGlobalState();
  return state.ws?.readyState === WebSocket.OPEN && state.status === "connected";
}

export function disconnect(): void {
  const state = getGlobalState();
  if (state.ws) {
    state.ws.close(1000, "User disconnected");
    state.ws = null;
  }
  cleanup();
  updateStatus("disconnected", "Disconnected");
}

export function reconnect(): void {
  const state = getGlobalState();
  // Close existing connection
  if (state.ws) {
    state.ws.close(1000, "Reconnecting");
    state.ws = null;
  }
  cleanup();
  state.sessionId = null;
  state.outputBuffer = [];
  // Connect fresh
  connect();
}

export type { ConnectionStatus };
