import esbuild from 'esbuild';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function start() {
  console.log('Building Electron scripts...');
  
  const options = {
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
    sourcemap: true,
  };

  // Perform initial sync build
  await esbuild.build(options);
  console.log('Initial build complete.');

  console.log('Starting CORS proxy...');
  const proxyProcess = spawn('node', [path.join(__dirname, 'cors-proxy.js')], {
    stdio: 'inherit',
    shell: true
  });

  console.log('Starting Vite development server...');
  const viteProcess = spawn('pnpm', ['dev:vite'], {
    stdio: 'inherit',
    shell: true
  });

  let electronProcess = null;

  function startElectron() {
    console.log('Launching Electron...');
    electronProcess = spawn('pnpm', ['exec', 'electron', path.join(__dirname, '../dist-electron/main.js')], {
      env: {
        ...process.env,
        NODE_ENV: 'development'
      },
      stdio: 'inherit',
      shell: true
    });

    electronProcess.on('close', (code) => {
      console.log(`Electron closed with code ${code}`);
      cleanup();
      process.exit(code || 0);
    });
  }

  function restartElectron() {
    if (electronProcess) {
      electronProcess.kill('SIGINT');
    }
    startElectron();
  }

  // Create watch context
  const watchContext = await esbuild.context({
    ...options,
    plugins: [{
      name: 'rebuild-notify',
      setup(build) {
        build.onEnd((result) => {
          console.log('Electron scripts rebuilt.');
          if (electronProcess) {
            restartElectron();
          }
        });
      }
    }]
  });

  await watchContext.watch();
  console.log('Watcher active for Electron scripts.');

  function cleanup() {
    console.log('Cleaning up processes...');
    try { proxyProcess.kill('SIGINT'); } catch(e) {}
    try { viteProcess.kill('SIGINT'); } catch(e) {}
    try { if (electronProcess) electronProcess.kill('SIGINT'); } catch(e) {}
    try { watchContext.dispose(); } catch(e) {}
  }

  // Wait 2.5s for Vite server to start before opening Electron
  setTimeout(() => {
    startElectron();
  }, 2500);

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}

start().catch(err => {
  console.error('Error starting Electron dev launcher:', err);
  process.exit(1);
});
