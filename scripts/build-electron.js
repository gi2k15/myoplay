import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function archiveOldReleases() {
  const releaseDir = path.join(__dirname, '../release');
  const oldsDir = path.join(releaseDir, 'olds');

  try {
    await fs.access(releaseDir);
  } catch {
    // Release directory doesn't exist, nothing to archive
    return;
  }

  console.log('Archiving old releases inside release/olds...');
  await fs.mkdir(oldsDir, { recursive: true });

  const entries = await fs.readdir(releaseDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === 'olds') {
      continue;
    }

    const srcPath = path.join(releaseDir, entry.name);
    const destPath = path.join(oldsDir, entry.name);

    try {
      await fs.rm(destPath, { recursive: true, force: true });
      await fs.rename(srcPath, destPath);
      console.log(`Moved to olds: ${entry.name}`);
    } catch (err) {
      console.warn(`Warning: Could not archive ${entry.name}:`, err.message);
    }
  }
}

async function buildProduction() {
  // Generate release changelog
  try {
    execSync('node scripts/generate-changelog.js', { stdio: 'inherit' });
  } catch (err) {
    console.warn('Warning: Could not generate release changelog:', err.message);
  }

  // Archive old releases before compiler starts
  await archiveOldReleases();

  console.log('Building Electron scripts for production...');
  
  // Build Main process script (ESM)
  await esbuild.build({
    entryPoints: [path.join(__dirname, '../electron/main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node22',
    outdir: path.join(__dirname, '../dist-electron'),
    external: ['electron'],
    format: 'esm',
    minify: true,
    sourcemap: false
  });

  // Build Preload script (CommonJS)
  await esbuild.build({
    entryPoints: [path.join(__dirname, '../electron/preload.ts')],
    bundle: true,
    platform: 'node',
    target: 'node22',
    outdir: path.join(__dirname, '../dist-electron'),
    external: ['electron'],
    format: 'cjs',
    minify: true,
    sourcemap: false
  });

  console.log('Electron production scripts built successfully.');
}

buildProduction().catch(err => {
  console.error('Failed to build Electron production scripts:', err);
  process.exit(1);
});
