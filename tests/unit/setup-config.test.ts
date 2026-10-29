import { describe, it, expect } from 'vitest';
import { getSetupConfig } from '../../src/server/services/setup-config.js';

describe('Setup Configuration Service & Client Packaging', () => {
  it('detects system paths and generates valid Claude Desktop configuration', () => {
    const config = getSetupConfig();

    expect(config.nodeBinary).toBeDefined();
    expect(config.serverPath).toContain('server.js');
    expect(config.dbPath).toBeDefined();

    expect(config.claudeDesktopConfig.mcpServers.orchstr).toBeDefined();
    expect(config.claudeDesktopConfig.mcpServers.orchstr.command).toBe(config.nodeBinary);
    expect(config.claudeDesktopConfig.mcpServers.orchstr.args[0]).toBe(config.serverPath);
    expect(config.claudeDesktopConfig.mcpServers.orchstr.env.ORCHSTR_DB_PATH).toBe(config.dbPath);
  });

  it('generates Cursor configuration matching the standard mcp schema', () => {
    const config = getSetupConfig();

    expect(config.cursorConfig.mcpServers.orchstr).toBeDefined();
    expect(config.cursorConfig.mcpServers.orchstr.command).toBe(config.nodeBinary);
  });

  it('includes human-only approval warning and anti-fabrication mandate in setup prompt', () => {
    const config = getSetupConfig();

    expect(config.setupPrompt).toContain('orchstr');
    expect(config.setupPrompt).toContain('NEVER approve, reject, or execute approvals yourself');
    expect(config.setupPrompt).toContain('zero fabricated data');
  });
});
