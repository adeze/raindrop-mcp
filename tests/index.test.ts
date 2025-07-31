#!/usr/bin/env bun
import { describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({
    // mock methods if needed
  })),
}));
vi.mock('dotenv', () => ({
  config: vi.fn(),
}));
vi.mock('../services/mcp-optimized.service.js', () => ({
  createOptimizedRaindropServer: vi.fn().mockImplementation(() => ({
    server: {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    },
    cleanup: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock('../utils/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

import { main } from '../src/index.js';

describe('MCP Server Entrypoint', () => {
  it('should initialize and connect the server', async () => {
    await expect(main()).resolves.not.toThrow();
  });

  it('should handle errors in main()', async () => {
    // Force an error in server.connect
    const { createOptimizedRaindropServer } = await import('../src/services/mcp-optimized.service.js');
    createOptimizedRaindropServer.mockImplementationOnce(() => ({
      server: {
        connect: vi.fn().mockRejectedValue(new Error('connect fail')),
        close: vi.fn(),
      },
      cleanup: vi.fn(),
    }));

    await expect(main()).rejects.toThrow('connect fail');
  });
});