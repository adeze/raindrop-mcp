import { config } from 'dotenv';
import { describe, expect, it } from 'vitest';

// Load .env from project root
config();
 // config({ path: '../.env' });
describe('.env configuration', () => {
  it('should load RAINDROP_ACCESS_TOKEN from environment variables and emit its value', () => {
 
    const accessToken = process.env.RAINDROP_ACCESS_TOKEN;

    // Defensive checks
    expect(accessToken).toBeTypeOf('string');
    expect(accessToken).not.toBe('');
    expect(accessToken).not.toBeNull();
    expect(accessToken).not.toBeUndefined();

    // Emit the value for debugging (write to stderr to avoid interfering with MCP protocol)
   // Always emit the value for debugging (safe for MCP protocol)
  
      process.stderr.write(`RAINDROP_ACCESS_TOKEN value: ${accessToken}\n`);
    
    expect(accessToken, `RAINDROP_ACCESS_TOKEN value: ${accessToken}`).toBeDefined();
  });
});

import { main } from '../src/index.js';

describe('MCP Server Entrypoint', () => {
  it('initializes and connects the server', async () => {
    await expect(main()).resolves.not.toThrow();
  });

  it('handles errors in main()', async () => {
    try {
      await main();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });
});
