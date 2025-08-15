import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		setupFiles: ['./tests/setup.ts'],
		globals: true,
		alias: {
			'@tauri-apps/api/core': '@tauri-apps/api/mocks',
			'@tauri-apps/api/event': '@tauri-apps/api/mocks',
			'@tauri-apps/api/window': '@tauri-apps/api/mocks'
		}
	}
});
