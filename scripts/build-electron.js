import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildProduction() {
  console.log('Building Electron scripts for production...');
  await esbuild.build({
    entryPoints: [
      path.join(__dirname, '../electron/main.ts'),
      path.join(__dirname, '../electron/preload.ts')
    ],
    bundle: true,
    platform: 'node',
    target: 'node22',
    outdir: path.join(__dirname, '../dist-electron'),
    external: ['electron'],
    format: 'esm',
    minify: true,
    sourcemap: false
  });
  console.log('Electron production scripts built successfully.');
}

buildProduction().catch(err => {
  console.error('Failed to build Electron production scripts:', err);
  process.exit(1);
});
