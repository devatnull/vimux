import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { ContainerManager } from './container-manager.js';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// Configuration
// =============================================================================

const PORT = parseInt(process.env.PORT || '3001', 10);
const MAX_SESSIONS = parseInt(process.env.MAX_SESSIONS || '15', 10);
const SESSION_TIMEOUT_MS = parseInt(process.env.SESSION_TIMEOUT || '1800000', 10); // 30 min
const IDLE_TIMEOUT_MS = parseInt(process.env.IDLE_TIMEOUT || '300000', 10); // 5 min
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

// =============================================================================
// Express App Setup
// =============================================================================

const app = express();

// Trust proxy (behind nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  const manager = ContainerManager.getInstance();
  res.json({
    status: 'ok',
    activeSessions: manager.getActiveSessionCount(),
    maxSessions: MAX_SESSIONS,
  });
});

// Stats endpoint (protected, add auth in production)
app.get('/stats', (req, res) => {
  const manager = ContainerManager.getInstance();
  res.json(manager.getStats());
});

// =============================================================================
// WebSocket Server
// =============================================================================

const server = http.createServer(app);
const wss = new WebSocketServer({ 
  server,
  path: '/ws',
  maxPayload: 64 * 1024, // 64KB max message size
});

interface Session {
  id: string;
  ws: WebSocket;
  containerId: string | null;
  createdAt: number;
  lastActivity: number;
  ip: string;
}

const sessions = new Map<string, Session>();

// Connection rate limiting per IP
const connectionAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_CONNECTIONS_PER_IP = 3;
const CONNECTION_WINDOW_MS = 60000; // 1 minute

function getClientIP(req: http.IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempts = connectionAttempts.get(ip);
  
  if (!attempts || now > attempts.resetAt) {
    connectionAttempts.set(ip, { count: 1, resetAt: now + CONNECTION_WINDOW_MS });
    return true;
  }
  
  if (attempts.count >= MAX_CONNECTIONS_PER_IP) {
    return false;
  }
  
  attempts.count++;
  return true;
}

wss.on('connection', async (ws: WebSocket, req: http.IncomingMessage) => {
  const ip = getClientIP(req);
  const sessionId = uuidv4();
  
  console.log(`[${sessionId}] New connection from ${ip}`);
  
  // Rate limit check
  if (!checkRateLimit(ip)) {
    console.log(`[${sessionId}] Rate limited: ${ip}`);
    ws.send(JSON.stringify({ type: 'error', message: 'Too many connections. Please wait.' }));
    ws.close(1008, 'Rate limited');
    return;
  }
  
  // Check max sessions
  const manager = ContainerManager.getInstance();
  if (manager.getActiveSessionCount() >= MAX_SESSIONS) {
    console.log(`[${sessionId}] Server at capacity`);
    ws.send(JSON.stringify({ type: 'error', message: 'Server at capacity. Please try again later.' }));
    ws.close(1013, 'Server at capacity');
    return;
  }
  
  // Create session
  const session: Session = {
    id: sessionId,
    ws,
    containerId: null,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    ip,
  };
  sessions.set(sessionId, session);
  
  // Send session info
  ws.send(JSON.stringify({ type: 'session', id: sessionId }));
  
  // Start container
  try {
    ws.send(JSON.stringify({ type: 'status', message: 'Starting terminal...' }));
    
    const containerId = await manager.createContainer(sessionId, (data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'output', data }));
      }
    });
    
    session.containerId = containerId;
    ws.send(JSON.stringify({ type: 'ready' }));
    console.log(`[${sessionId}] Container started: ${containerId.substring(0, 12)}`);
    
  } catch (error) {
    console.error(`[${sessionId}] Failed to start container:`, error);
    ws.send(JSON.stringify({ type: 'error', message: 'Failed to start terminal.' }));
    ws.close(1011, 'Container error');
    sessions.delete(sessionId);
    return;
  }
  
  // Handle incoming messages (terminal input)
  ws.on('message', async (message: Buffer) => {
    session.lastActivity = Date.now();
    
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'input':
          if (session.containerId && typeof data.data === 'string') {
            // Sanitize input - block dangerous sequences
            const sanitized = sanitizeInput(data.data);
            if (sanitized !== null) {
              await manager.sendInput(session.containerId, sanitized);
            }
          }
          break;
          
        case 'resize':
          if (session.containerId && data.cols && data.rows) {
            const cols = Math.min(Math.max(data.cols, 10), 300);
            const rows = Math.min(Math.max(data.rows, 5), 100);
            await manager.resize(session.containerId, cols, rows);
          }
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (error) {
      console.error(`[${sessionId}] Message error:`, error);
    }
  });
  
  // Handle disconnect
  ws.on('close', async () => {
    console.log(`[${sessionId}] Disconnected`);
    await cleanupSession(sessionId);
  });
  
  ws.on('error', (error) => {
    console.error(`[${sessionId}] WebSocket error:`, error);
  });
  
  // Session timeout
  const timeoutCheck = setInterval(() => {
    const now = Date.now();
    
    // Check absolute session timeout
    if (now - session.createdAt > SESSION_TIMEOUT_MS) {
      console.log(`[${sessionId}] Session timeout (absolute)`);
      ws.send(JSON.stringify({ type: 'timeout', message: 'Session expired. Please reconnect.' }));
      ws.close(1000, 'Session timeout');
      clearInterval(timeoutCheck);
      return;
    }
    
    // Check idle timeout
    if (now - session.lastActivity > IDLE_TIMEOUT_MS) {
      console.log(`[${sessionId}] Session timeout (idle)`);
      ws.send(JSON.stringify({ type: 'timeout', message: 'Session idle timeout. Please reconnect.' }));
      ws.close(1000, 'Idle timeout');
      clearInterval(timeoutCheck);
      return;
    }
  }, 30000); // Check every 30 seconds
  
  ws.on('close', () => clearInterval(timeoutCheck));
});

// =============================================================================
// Input Sanitization
// =============================================================================

function sanitizeInput(input: string): string | null {
  // Block control characters except common ones
  const allowedControlChars = [
    '\x03', // Ctrl+C
    '\x04', // Ctrl+D
    '\x1a', // Ctrl+Z
    '\x1b', // Escape
    '\r',   // Enter
    '\n',   // Newline
    '\t',   // Tab
    '\x7f', // Backspace
  ];
  
  let sanitized = '';
  for (const char of input) {
    const code = char.charCodeAt(0);
    
    // Allow printable ASCII
    if (code >= 32 && code <= 126) {
      sanitized += char;
      continue;
    }
    
    // Allow specific control characters
    if (allowedControlChars.includes(char)) {
      sanitized += char;
      continue;
    }
    
    // Allow escape sequences (for arrow keys etc)
    if (code === 27) {
      sanitized += char;
      continue;
    }
  }
  
  // Block potentially dangerous command patterns
  const dangerousPatterns = [
    /rm\s+-rf\s+\//i,
    /mkfs/i,
    /dd\s+if=/i,
    /:\(\)\s*{\s*:\|:/i, // Fork bomb
    />\s*\/dev\/sd/i,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      console.warn('Blocked dangerous input pattern');
      return null;
    }
  }
  
  return sanitized;
}

// =============================================================================
// Session Cleanup
// =============================================================================

async function cleanupSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  sessions.delete(sessionId);
  
  if (session.containerId) {
    try {
      const manager = ContainerManager.getInstance();
      await manager.destroyContainer(session.containerId);
    } catch (error) {
      console.error(`[${sessionId}] Cleanup error:`, error);
    }
  }
}

// Periodic cleanup of stale sessions
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions) {
    if (session.ws.readyState !== WebSocket.OPEN) {
      console.log(`[${sessionId}] Cleaning up stale session`);
      cleanupSession(sessionId);
    }
  }
}, 60000); // Every minute

// =============================================================================
// Graceful Shutdown
// =============================================================================

async function shutdown(): Promise<void> {
  console.log('Shutting down...');
  
  // Close all WebSocket connections
  for (const [sessionId, session] of sessions) {
    session.ws.send(JSON.stringify({ type: 'shutdown', message: 'Server shutting down.' }));
    session.ws.close(1001, 'Server shutdown');
  }
  
  // Destroy all containers
  const manager = ContainerManager.getInstance();
  await manager.destroyAllContainers();
  
  // Close server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced exit');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// =============================================================================
// Start Server
// =============================================================================

server.listen(PORT, () => {
  console.log(`Terminal learning backend running on port ${PORT}`);
  console.log(`Max sessions: ${MAX_SESSIONS}`);
  console.log(`Session timeout: ${SESSION_TIMEOUT_MS / 1000 / 60} minutes`);
  console.log(`Idle timeout: ${IDLE_TIMEOUT_MS / 1000 / 60} minutes`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
