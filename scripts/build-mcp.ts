import esbuild from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';

async function build() {
  const distDir = path.resolve('dist/mcp');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  await esbuild.build({
    entryPoints: ['src/mcp/server.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    outfile: 'dist/mcp/server.js',
    external: [
      'node:*'
    ]
  });

  process.stderr.write('Successfully built dist/mcp/server.js\n');
}

build().catch((err) => {
  process.stderr.write(`Build failed: ${err.message}\n`);
  process.exit(1);
});
