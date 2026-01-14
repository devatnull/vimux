#!/usr/bin/env node
// Quick test script to verify WebSocket + Docker container works
const WebSocket = require('ws');

const WS_URL = process.env.WS_URL || 'ws://localhost:3001/ws';

console.log(`Connecting to ${WS_URL}...`);

const ws = new WebSocket(WS_URL);

let sessionId = null;
let ready = false;

ws.on('open', () => {
  console.log('✓ WebSocket connected');
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    
    switch (msg.type) {
      case 'session':
        sessionId = msg.id;
        console.log(`✓ Session ID: ${sessionId}`);
        break;
        
      case 'status':
        console.log(`  Status: ${msg.message}`);
        break;
        
      case 'ready':
        ready = true;
        console.log('✓ Terminal ready!');
        console.log('\n--- Terminal output ---');
        
        // Send resize first (tmux needs this)
        ws.send(JSON.stringify({ type: 'resize', cols: 80, rows: 24 }));
        
        // Send a test command after a short delay
        setTimeout(() => {
          console.log('\n--- Sending: nvim --version | head -1 ---');
          ws.send(JSON.stringify({ type: 'input', data: 'nvim --version | head -1\r' }));
        }, 500);
        
        // Close after 4 seconds
        setTimeout(() => {
          console.log('\n--- Test complete, closing ---');
          ws.close(1000, 'Test complete');
        }, 4000);
        break;
        
      case 'output':
        process.stdout.write(msg.data);
        break;
        
      case 'error':
        console.error(`✗ Error: ${msg.message}`);
        break;
        
      case 'pong':
        break;
        
      default:
        console.log(`Unknown message type: ${msg.type}`);
    }
  } catch (e) {
    console.error('Failed to parse message:', e);
  }
});

ws.on('error', (err) => {
  console.error('✗ WebSocket error:', err.message);
});

ws.on('close', (code, reason) => {
  console.log(`\nConnection closed: ${code} ${reason}`);
  process.exit(ready ? 0 : 1);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.error('✗ Timeout waiting for ready');
  ws.close();
  process.exit(1);
}, 30000);
