import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PORT = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 3002;
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess: any;

// Helper to start/stop the server for integration tests
beforeAll(async () => {
  // Start the server as a child process if not already running
  // (Assume Bun is used for scripts)
  // You may want to use a test-specific port to avoid conflicts
  // This is a placeholder: in CI, the server should be started externally
});

afterAll(async () => {
  // Optionally stop the server if started here
});

describe('HTTP Server Entrypoint (src/server.ts)', () => {
  it('responds to /health with healthy status and session info', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe('healthy');
    expect(body.service).toContain('raindrop-mcp');
    expect(typeof body.activeSessions).toBe('number');
    expect(Array.isArray(body.sessions)).toBe(true);
    expect(body.optimizations).toBeDefined();
  });

  it('responds to / with documentation and endpoint info', async () => {
    const res = await fetch(`${BASE_URL}/`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.name).toContain('Raindrop MCP');
    expect(body.endpoints).toBeDefined();
    expect(body.optimizations).toBeDefined();
    expect(body.usage).toBeDefined();
  });

  it('returns 400 for invalid /mcp requests', async () => {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foo: 'bar' })
    });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toBeDefined();
    expect(body.error.message).toContain('Bad Request');
  });

  it('returns 200 for OPTIONS /mcp (CORS preflight)', async () => {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: 'OPTIONS',
    });
    expect(res.status).toBe(200);
  });

  it('handles MCP protocol initialize session (happy path)', async () => {
    const initializeRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        clientInfo: { name: 'test-client', version: '1.0.0' },
        capabilities: {},
      }
    };
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initializeRequest)
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    // Type assertion for test safety
    const rpcBody = body as any;
    expect(rpcBody.jsonrpc).toBe('2.0');
    expect(rpcBody.id).toBe(1);
    expect(rpcBody.result).toBeDefined();
    // Defensive: result should include serverInfo or capabilities
    expect(rpcBody.result.serverInfo || rpcBody.result.capabilities).toBeDefined();
  });
});
