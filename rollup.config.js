import svelte from 'rollup-plugin-svelte';

export default {
	entry: 'src/index.js',
	dest: 'dist.js',
	format: 'iife',
	plugins: [
		svelte()
	]
};
