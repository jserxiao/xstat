import typescript from '@rollup/plugin-typescript';
import ts2 from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import strip from '@rollup/plugin-strip';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import cleanup from 'rollup-plugin-cleanup';
import del from 'rollup-plugin-delete';
import { dts } from 'rollup-plugin-dts';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

// 获取安全的文件名（移除 @scope/ 前缀中的特殊字符）
const safeName = pkg.name.replace(/^@[^/]+\//, '').replace(/[@/]/g, '-');

const banner = `/*!
 * ${pkg.name} v${pkg.version}
 * ${pkg.description}
 * (c) ${new Date().getFullYear()}
 * @license MIT
 */`;

export default [
    // ESM build
    {
        input: 'index.ts',
        output: {
            file: `dist/${safeName}.js`,
            format: 'es',
            banner,
            sourcemap: true,
        },
        external: [],
        plugins: [
            del({ targets: 'dist/*' }),
            cleanup(),
            ts2({
                tsconfig: './tsconfig.json',
                useTsconfigDeclarationDir: true,
            }),
            strip({
                functions: ['console.log', 'console.debug'],
            }),
            resolve(),
            commonjs(),
            json(),
        ],
    },
    // CJS build
    {
        input: 'index.ts',
        output: {
            file: `dist/${safeName}.cjs`,
            format: 'cjs',
            banner,
            sourcemap: true,
            exports: 'named',
        },
        external: [],
        plugins: [
            ts2({
                tsconfig: './tsconfig.json',
            }),
            strip({
                functions: ['console.log', 'console.debug'],
            }),
            resolve(),
            commonjs(),
            json(),
        ],
    },
    // UMD build (minified)
    {
        input: 'index.ts',
        output: {
            file: `dist/${safeName}.min.js`,
            format: 'umd',
            name: 'XStat',
            banner,
            sourcemap: true,
        },
        plugins: [
            ts2({
                tsconfig: './tsconfig.json',
            }),
            strip({
                functions: ['console.log', 'console.debug'],
            }),
            resolve(),
            commonjs(),
            json(),
            terser({
                format: {
                    comments: /^!/,
                },
            }),
        ],
    },
    // IIFE build (for direct script tag)
    {
        input: 'index.ts',
        output: {
            file: `dist/${safeName}.iife.js`,
            format: 'iife',
            name: 'XStat',
            banner,
            sourcemap: true,
        },
        plugins: [
            ts2({
                tsconfig: './tsconfig.json',
            }),
            strip({
                functions: ['console.log', 'console.debug'],
            }),
            resolve(),
            commonjs(),
            json(),
        ],
    },
    // Type declarations
    {
        input: 'types/index.d.ts',
        output: {
            file: `dist/${safeName}.d.ts`,
            format: 'es',
        },
        plugins: [dts()],
    },
];
