

import { spawn } from 'child_process';
import { describe, expect, it } from 'vitest';

describe('MCP Inspector CLI', () => {
  it('lists available tools via Inspector CLI', async () => {
    const cmd = [
      'npx',
      '-y',
      '@modelcontextprotocol/inspector',
      '--cli',
      'node',
      'build/index.js',
      '--method',
      'tools/list'
    ];

    const proc = spawn(cmd[0]!, cmd.slice(1), {
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    proc.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    await new Promise((resolve) => proc.on('close', resolve));

    expect(output).toMatch(/tools|list/i);
    expect(output).toMatch(/id|name/i);
  });

  it('responds to a valid MCP protocol request (ping)', async () => {
    const cmd = [
      'npx',
      '-y',
      '@modelcontextprotocol/inspector',
      '--cli',
      'node',
      'build/index.js',
      '--method',
      'ping'
    ];

    const proc = spawn(cmd[0]!, cmd.slice(1), {
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    proc.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    await new Promise((resolve) => proc.on('close', resolve));

    expect(output).toContain('id');
    expect(output).toMatch(/"id"/);
  });
});
