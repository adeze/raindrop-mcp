import { describe, expect, it, vi } from 'vitest';

// Mocks
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));
vi.mock('dotenv', () => ({
  config: vi.fn(),
}));
vi.mock('../src/services/raindropmcp.service.js', () => ({
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
  it('initializes and connects the server', async () => {
    await expect(main()).resolves.not.toThrow();
  });

  it('handles errors in main()', async () => {
    const { createOptimizedRaindropServer } = await import('../src/services/raindropmcp.service.js');
    vi.mocked(createOptimizedRaindropServer).mockImplementationOnce(() => ({
      server: {
        connect: vi.fn().mockRejectedValue(new Error('connect fail')),
        close: vi.fn(),
      } as any,
      cleanup: vi.fn(),
    }));
    await expect(main()).rejects.toThrow('connect fail');
  });
});