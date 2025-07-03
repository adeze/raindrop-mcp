#!/usr/bin/env node

// CLI entry point for STDIO transport
// Ensures all logging goes to stderr, stdout reserved for MCP protocol messages
import { main } from './index.js';

// Redirect any potential console.log to stderr for CLI safety
const originalConsoleLog = console.log;
console.log = (...args: any[]) => {
  process.stderr.write(args.join(' ') + '\n');
};

// Start the STDIO MCP server
main();