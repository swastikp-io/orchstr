import path from 'node:path';
import { resolveDbPath, getRepoRoot } from '../../db/connection.js';

export interface SetupConfigInfo {
  repoRoot: string;
  nodeBinary: string;
  serverPath: string;
  dbPath: string;
  claudeDesktopConfig: Record<string, any>;
  cursorConfig: Record<string, any>;
  claudeCodeCommand: string;
  setupPrompt: string;
  fullCopyText: string;
}

export function getSetupConfig(): SetupConfigInfo {
  const repoRoot = getRepoRoot();
  const nodeBinary = process.execPath;
  const serverPath = path.resolve(repoRoot, 'dist/mcp/server.js');
  const dbPath = resolveDbPath();

  const claudeDesktopConfig = {
    mcpServers: {
      orchstr: {
        command: nodeBinary,
        args: [serverPath],
        env: {
          ORCHSTR_DB_PATH: dbPath
        }
      }
    }
  };

  const cursorConfig = {
    mcpServers: {
      orchstr: {
        command: nodeBinary,
        args: [serverPath],
        env: {
          ORCHSTR_DB_PATH: dbPath
        }
      }
    }
  };

  const claudeCodeCommand = `claude mcp add orchstr -- "${nodeBinary}" "${serverPath}" -e ORCHSTR_DB_PATH="${dbPath}"`;

  const setupPrompt = `You are connected to the ORCHSTR MCP server (AI-Native Company Operating System).
Always run the \`orchstr\` MCP prompt to bootstrap or execute tasks.
NEVER approve, reject, or execute approvals yourself—approvals stay human-only in the dashboard or CLI.
Always cite real sources for every claim, and adhere strictly to zero fabricated data.`;

  const fullCopyText = `${setupPrompt}

=== Claude Desktop Configuration ===
Paste into claude_desktop_config.json:
${JSON.stringify(claudeDesktopConfig, null, 2)}

=== Cursor Configuration ===
Paste into .cursor/mcp.json:
${JSON.stringify(cursorConfig, null, 2)}

=== Claude Code CLI ===
${claudeCodeCommand}
`;

  return {
    repoRoot,
    nodeBinary,
    serverPath,
    dbPath,
    claudeDesktopConfig,
    cursorConfig,
    claudeCodeCommand,
    setupPrompt,
    fullCopyText
  };
}
