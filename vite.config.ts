import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [react()],
	base: process.env.NODE_ENV === 'production'
		? '/editor/'
		: '/',
	build: {
		rollupOptions: {
			output: {
				codeSplitting: true,
				manualChunks: (id) => {
					if (id.includes('node_modules/blockly')) {
						return 'blockly';
					}
					if (id.includes('node_modules/konva')) {
						return 'konva';
					}
					if (id.includes('node_modules')) {
						return 'vendor';
					}
				}
			}
		}
	}
});
