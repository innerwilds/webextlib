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
	// Testing
	{
		input: 'src/index.ts',
		output: {
			name: 'webextlib',
			format: 'iife',
			file: 'tests/in-browser/webextlib.js'
		},
		plugins: [typescript(), nodeResolve({preferBuiltins: false, browser: true}), cjs(), json()],
	}
];
