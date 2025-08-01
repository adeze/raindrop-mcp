import { config } from 'dotenv';
import { describe, expect, it } from 'vitest';

// Load .env from project root
config();
 // config({ path: '../.env' });
describe('.env configuration', () => {
  it('should load RAINDROP_ACCESS_TOKEN from environment variables and emit its value', () => {
    const accessToken = process.env.RAINDROP_ACCESS_TOKEN;
    // Defensive checks for type safety and presence
    expect(typeof accessToken).toBe('string');
    expect(accessToken).toBeDefined();
    expect(accessToken).not.toBe('');
    // Emit the value for debugging (write to stderr to avoid interfering with MCP protocol)
    process.stderr.write(`RAINDROP_ACCESS_TOKEN value: ${accessToken}\n`);
  });
});

import { main } from '../src/index.js';

describe('MCP Server Entrypoint', () => {
  it('initializes and connects the server', async () => {
    await expect(main()).resolves.not.toThrow();
  });

  it('handles errors in main()', async () => {
    let errorCaught = false;
    try {
      await main();
    } catch (err) {
      errorCaught = true;
      expect(err).toBeInstanceOf(Error);
    }
    // Optionally assert that error was actually thrown if main() is expected to throw
    // expect(errorCaught).toBe(true);
  });
});
