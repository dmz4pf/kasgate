import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');
const isProd = process.argv.includes('--prod');

// Server build configuration
const serverConfig = {
  entryPoints: ['src/server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outdir: 'dist/server',
  format: 'esm',
  external: ['better-sqlite3', 'kaspa'],
  sourcemap: !isProd,
  minify: isProd,
};

// Widget build configuration
const widgetConfig = {
  entryPoints: ['src/widget/index.ts'],
  bundle: true,
  platform: 'browser',
  target: ['es2020', 'chrome80', 'firefox80', 'safari14'],
  outfile: 'dist/kasgate.js',
  format: 'iife',
  globalName: 'KasGate',
  sourcemap: !isProd,
  minify: isProd,
};

async function build() {
  try {
    if (isWatch) {
      const serverCtx = await esbuild.context(serverConfig);
      const widgetCtx = await esbuild.context(widgetConfig);

      await Promise.all([
        serverCtx.watch(),
        widgetCtx.watch(),
      ]);

      console.log('Watching for changes...');
    } else {
      await Promise.all([
        esbuild.build(serverConfig),
        esbuild.build(widgetConfig),
      ]);

      console.log('Build complete!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
