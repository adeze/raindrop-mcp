import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PORT = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 3002;
const BASE_URL = `http://localhost:${PORT}`;

describe('HTTP SSE Server Implementation', () => {
  beforeAll(async () => {
    // Server should already be running for these tests
    // Wait a moment to ensure server is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('establishes SSE connection with proper headers', async () => {
    const controller = new AbortController();
    const response = await fetch(`${BASE_URL}/sse`, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
    expect(response.headers.get('cache-control')).toContain('no-cache');
    expect(response.headers.get('connection')).toBe('keep-alive');

    // Clean up
    controller.abort();
  });

  it('receives endpoint event with session ID on SSE connection', async () => {
    const controller = new AbortController();
    const response = await fetch(`${BASE_URL}/sse`, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    expect(response.status).toBe(200);

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    if (reader) {
      const decoder = new TextDecoder();
      const { value } = await reader.read();
      const text = decoder.decode(value);
      
      expect(text).toContain('event: endpoint');
      expect(text).toContain('data: /messages?sessionId=');
      
      // Extract session ID for validation
      const sessionMatch = text.match(/sessionId=([a-f0-9-]+)/);
      expect(sessionMatch).toBeTruthy();
      expect(sessionMatch![1]).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    }

    // Clean up
    controller.abort();
  });

  it('handles POST messages through /messages endpoint', async () => {
    // First establish SSE connection
    const controller = new AbortController();
    const sseResponse = await fetch(`${BASE_URL}/sse`, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    expect(sseResponse.status).toBe(200);

    // Send a ping message via POST
    const messageResponse = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'ping'
      })
    });

    expect(messageResponse.status).toBe(202); // Accepted - correct for async SSE messages
    const responseText = await messageResponse.text();
    expect(responseText).toBe('Accepted');

    // Clean up
    controller.abort();
  });

  it('handles SSE session tracking in health endpoint', async () => {
    // Establish SSE connection
    const controller = new AbortController();
    const sseResponse = await fetch(`${BASE_URL}/sse`, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    expect(sseResponse.status).toBe(200);

    // Check health endpoint
    const healthResponse = await fetch(`${BASE_URL}/health`);
    expect(healthResponse.status).toBe(200);
    
    const health = await healthResponse.json() as any;
    expect(health.sessionTypes.sse).toBeGreaterThan(0);
    expect(health.activeSessions).toBeGreaterThan(0);
    expect(health.transports.legacy).toContain('SSEServerTransport');

    // Clean up
    controller.abort();
  });

  it('returns 400 for invalid JSON in /messages endpoint', async () => {
    const response = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: 'invalid json'
    });

    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body.error).toBeDefined();
  });

  it('includes SSE endpoints in documentation', async () => {
    const response = await fetch(`${BASE_URL}/`);
    expect(response.status).toBe(200);
    
    const body = await response.json() as any;
    expect(body.endpoints['/sse']).toContain('Legacy SSE connection endpoint');
    expect(body.endpoints['/messages']).toContain('Legacy SSE message endpoint');
    expect(body.usage['Legacy SSE']).toContain('/sse');
    expect(body.usage['Legacy SSE']).toContain('/messages');
  });

  it('handles concurrent SSE sessions', async () => {
    const controllers: AbortController[] = [];
    const responses: Response[] = [];

    try {
      // Establish multiple SSE connections
      for (let i = 0; i < 3; i++) {
        const controller = new AbortController();
        controllers.push(controller);
        
        const response = await fetch(`${BASE_URL}/sse`, {
          method: 'GET',
          headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          signal: controller.signal,
        });
        
        expect(response.status).toBe(200);
        responses.push(response);
      }

      // Check health endpoint shows multiple sessions
      const healthResponse = await fetch(`${BASE_URL}/health`);
      const health = await healthResponse.json() as any;
      expect(health.sessionTypes.sse).toBeGreaterThanOrEqual(3);

    } finally {
      // Clean up all connections
      controllers.forEach(controller => controller.abort());
    }
  });

  afterAll(async () => {
    // Give time for cleanup
    await new Promise(resolve => setTimeout(resolve, 500));
  });
});