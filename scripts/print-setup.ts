import { getSetupConfig } from '../src/server/services/setup-config.js';

export function printSetup(): void {
  const config = getSetupConfig();

  process.stdout.write(`\n=======================================================\n`);
  process.stdout.write(` ORCHSTR MCP CLIENT CONFIGURATION (Detected Paths)\n`);
  process.stdout.write(`=======================================================\n\n`);

  process.stdout.write(`1. Claude Desktop (claude_desktop_config.json):\n`);
  process.stdout.write(JSON.stringify(config.claudeDesktopConfig, null, 2) + '\n\n');

  process.stdout.write(`2. Cursor (.cursor/mcp.json):\n`);
  process.stdout.write(JSON.stringify(config.cursorConfig, null, 2) + '\n\n');

  process.stdout.write(`3. Claude Code CLI:\n`);
  process.stdout.write(`${config.claudeCodeCommand}\n\n`);

  process.stdout.write(`4. Agent Setup Prompt (Paste into Claude Desktop / Cursor chat):\n`);
  process.stdout.write(`-------------------------------------------------------\n`);
  process.stdout.write(`${config.setupPrompt}\n`);
  process.stdout.write(`-------------------------------------------------------\n\n`);
}

printSetup();
