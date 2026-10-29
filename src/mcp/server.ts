#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getDatabase, resolveDbPath } from '../db/connection.js';
import { registerMcpTools } from './tools.js';
import { registerMcpResources } from './resources.js';
import { registerMcpPrompts } from './prompts.js';
import { SafeLogger } from '../server/services/logger.js';

// 1. Fail fast if node:sqlite is unavailable (requires Node >= 22.5)
try {
  const { DatabaseSync } = await import('node:sqlite');
  if (!DatabaseSync) {
    throw new Error('DatabaseSync not found on node:sqlite');
  }
} catch (err: any) {
  process.stderr.write(
    `[ORCHSTR FATAL] node:sqlite is unavailable. Node.js version >= 22.5 is required (currently running ${process.version}).\n`
  );
  process.exit(1);
}

// 2. Prevent uncaught errors from corrupting stdio transport
process.on('uncaughtException', (err) => {
  SafeLogger.error(`Uncaught exception in MCP server: ${err.message}`, err);
});
process.on('unhandledRejection', (reason) => {
  SafeLogger.error(`Unhandled rejection in MCP server: ${reason}`);
});

async function main() {
  const dbPath = resolveDbPath();
  SafeLogger.info(`Initializing ORCHSTR MCP server with database at: ${dbPath}`);

  const db = getDatabase(dbPath);

  const server = new McpServer({
    name: 'orchstr',
    version: '1.0.0'
  });

  registerMcpTools(server, db);
  registerMcpResources(server, db);
  registerMcpPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  SafeLogger.info('ORCHSTR MCP server connected via StdioServerTransport.');
}

main().catch((err) => {
  process.stderr.write(`[ORCHSTR FATAL] Failed to start MCP server: ${err.message}\n`);
  process.exit(1);
});
