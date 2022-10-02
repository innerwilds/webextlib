import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import cjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default [
	{
		external: ['webextension-polyfill'],
		input: 'src/index.ts',
		output: {
			format: 'cjs',
			file: 'lib/index.cjs.js',
			sourcemap: true,
		},
		plugins: [typescript(), nodeResolve({preferBuiltins: false, browser: true}), cjs(), json()],
	},
	{
		external: ['webextension-polyfill'],
		input: 'src/index.ts',
		output: {
			format: 'esm',
			file: 'lib/index.esm.js',
			sourcemap: true,
		},
		plugins: [typescript(), nodeResolve({preferBuiltins: false, browser: true}), cjs(), json()],
	},
	{
		input: 'tests/in-browser/src/popup.ts',
		output: {
			name: 'ExtensionPopup',
			format: 'iife',
			file: 'tests/in-browser/target/popup.js',
			sourcemap: true,
		},
		plugins: [typescript(), nodeResolve({preferBuiltins: false, browser: true}), cjs(), json()],
	},
	{
		input: 'tests/in-browser/src/bg.ts',
		output: {
			name: 'ExtensionBG',
			format: 'iife',
			file: 'tests/in-browser/target/bg.js',
			sourcemap: true,
		},
		plugins: [typescript(), nodeResolve({preferBuiltins: false, browser: true}), cjs(), json()],
	},
];
