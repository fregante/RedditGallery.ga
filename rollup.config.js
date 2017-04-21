import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';

export default {
	entry: 'src/index.js',
	format: 'iife',
	plugins: [
		nodeResolve(),
		commonjs(),
		svelte()
	]
};
