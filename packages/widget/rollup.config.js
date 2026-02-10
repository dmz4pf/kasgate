import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

const banner = `/*!
 * @kasgate/widget v${pkg.version}
 * Embeddable Kaspa payment widget
 * (c) ${new Date().getFullYear()} KasGate Team
 * Released under the MIT License
 */`;

export default [
  // UMD build (for browsers via <script> tag)
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/kasgate.umd.js',
        format: 'umd',
        name: 'KasGate',
        banner,
        sourcemap: true,
      },
      {
        file: 'dist/kasgate.umd.min.js',
        format: 'umd',
        name: 'KasGate',
        banner,
        sourcemap: true,
        plugins: [terser()],
      },
    ],
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist',
      }),
    ],
  },
  // ESM build (for bundlers)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/kasgate.esm.js',
      format: 'esm',
      banner,
      sourcemap: true,
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // CJS build (for Node.js SSR)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/kasgate.cjs.js',
      format: 'cjs',
      banner,
      sourcemap: true,
      exports: 'named',
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
];
