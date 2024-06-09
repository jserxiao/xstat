import typescript from "@rollup/plugin-typescript";
import ts2 from 'rollup-plugin-typescript2';
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import strip from "@rollup/plugin-strip";
import json from '@rollup/plugin-json';
import pkg from './package.json' assert {type: 'json'};
import externals from 'rollup-plugin-node-externals';
import cleanup from 'rollup-plugin-cleanup';
import del from 'rollup-plugin-delete';
import babel from "@rollup/plugin-babel";
import terser from '@rollup/plugin-terser';
import {dts} from 'rollup-plugin-dts';

export default [{
    input: 'index.ts',
    output: [
        {
            format: 'es',
            file: `dist/${pkg.name}.js`,
            name: pkg.name,
        },{
            format: 'cjs',
            file: `dist/${pkg.name}.cjs`,
            name: pkg.name,
        },
        ,{
            format: 'umd',
            name: pkg.name,
            file: `dist/${pkg.name}.mjs`,
        },
    ],
    external: ["lodash"],
    plugins: [
        del({
            targets: 'dist/*'
        }),
        cleanup(),
        ts2(),
        strip(),
        commonjs(),
        resolve(),
        // typescript(),
        json(),
        babel({
            exclude: 'node_modules/**', // 防止打包node_modules下的文件
        }),
        terser(),
        externals({
            devDeps: false
        })
    ]
}, {
    input: 'types/index.d.ts',
    output: { file: `dist/${pkg.name}.d.ts`, format: "es" },
    plugins: [dts(),resolve()]
}]