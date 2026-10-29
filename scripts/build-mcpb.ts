import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

function buildMcpb() {
  const distDir = path.resolve('dist');
  const bundlePath = path.join(distDir, 'orchstr.mcpb');
  const manifestPath = path.resolve('manifest.json');
  const serverPath = path.resolve('dist/mcp/server.js');

  if (!fs.existsSync(serverPath)) {
    throw new Error('MCP server bundle dist/mcp/server.js not found. Run npm run mcp:build first.');
  }

  const tempZipPath = path.join(distDir, 'orchstr_temp.zip');

  if (fs.existsSync(bundlePath)) {
    fs.unlinkSync(bundlePath);
  }
  if (fs.existsSync(tempZipPath)) {
    fs.unlinkSync(tempZipPath);
  }

  process.stderr.write('Packaging .mcpb bundle...\n');

  try {
    if (process.platform === 'win32') {
      execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${manifestPath}', '${path.resolve('dist/mcp')}' -DestinationPath '${tempZipPath}' -Force; Move-Item -Path '${tempZipPath}' -Destination '${bundlePath}' -Force"`);
    } else {
      execSync(`zip -r "${bundlePath}" manifest.json dist/mcp`);
    }
    process.stderr.write(`Successfully generated bundle at: ${bundlePath}\n`);
    process.stderr.write('Note: .mcpb desktop extensions require host Node.js >= 22.5 for node:sqlite support.\n');
  } catch (err: any) {
    process.stderr.write(`Warning: Failed to create zip bundle via system utility: ${err.message}\n`);
    process.stderr.write('Please ensure zip or PowerShell Compress-Archive is accessible in PATH.\n');
  }
}

buildMcpb();
