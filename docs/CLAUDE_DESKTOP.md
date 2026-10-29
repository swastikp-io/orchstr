# Connecting ORCHSTR to Claude Desktop, Cursor & Claude Code

ORCHSTR exposes a standard **Model Context Protocol (MCP)** server over stdio. This enables external reasoning agents—such as **Claude Desktop**, **Cursor IDE**, and **Claude Code**—to act as the executive operator and specialist workforce of your company while ORCHSTR deterministically governs state, DAG dependencies, tamper-evident human approvals, and shared memory.

---

## 1. Automated Setup Helper

ORCHSTR includes an automated configuration helper that inspects your local environment, detects your absolute `node` binary path, locates `dist/mcp/server.js`, and outputs ready-to-paste JSON:

```bash
npm run setup:print
```

Ensure the server bundle is built first:
```bash
npm run mcp:build
```

---

## 2. Claude Desktop Setup

### Configuration File Location:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Snippet:
```json
{
  "mcpServers": {
    "orchstr": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/orchstr/dist/mcp/server.js"
      ],
      "env": {
        "ORCHSTR_DB_PATH": "/ABSOLUTE/PATH/TO/orchstr/orchstr.db"
      }
    }
  }
}
```
*(On Windows, use full paths with escaped backslashes, e.g. `C:\\Program Files\\nodejs\\node.exe`)*

---

## 3. Cursor Setup

Add ORCHSTR to `.cursor/mcp.json` in your workspace or configure in **Cursor Settings ➔ Features ➔ MCP**:

```json
{
  "mcpServers": {
    "orchstr": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/orchstr/dist/mcp/server.js"
      ],
      "env": {
        "ORCHSTR_DB_PATH": "/ABSOLUTE/PATH/TO/orchstr/orchstr.db"
      }
    }
  }
}
```

---

## 4. Claude Code Setup

Run the following command in your terminal:

```bash
claude mcp add orchstr -- node "/ABSOLUTE/PATH/TO/orchstr/dist/mcp/server.js" -e ORCHSTR_DB_PATH="/ABSOLUTE/PATH/TO/orchstr/orchstr.db"
```

---

## 5. First Prompt to Run in Claude / Cursor

Once connected, paste this setup prompt into your conversation:

> "You are connected to the ORCHSTR MCP server. Please run the `orchstr` MCP prompt with our startup idea: [YOUR BUSINESS IDEA]. Execute ready tasks sequentially using `get_next_task` and `submit_task`. Never approve consequential actions yourself—approvals stay human-only in the ORCHSTR dashboard."

---

## 6. MCP Protocol Guardrails

- **Zero Model Runtime Boundary**: ORCHSTR runs zero model API calls. All reasoning happens in your connected client.
- **Human-Only Approvals**: The MCP server never exposes tools to execute or approve approvals (`approve_approval`, `reject_approval`, etc.). All consequential external actions (sending emails, budget allocation) remain safe simulations until approved by a human in the dashboard or CLI.
- **Strict Multi-Tenant Isolation**: Every tool call and resource is scoped by `company_id`.
