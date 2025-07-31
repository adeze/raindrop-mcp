#!/usr/bin/env node

/**
 * CLI entrypoint for the Raindrop MCP server.
 *
 * This script allows running the MCP server from the command line.
 * It simply invokes the main STDIO server bootstrap.
 */
import { main } from './index.js';

// Run the main STDIO server
main().catch(err => {
  process.stderr.write(`Startup error: ${err?.stack || err}\n`);
  process.exit(1);
});

main();