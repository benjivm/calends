import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    name: 'core',
                    include: ['packages/core/src/**/*.test.ts'],
                    environment: 'node',
                },
            },
            {
                plugins: [vue()],
                // Tests run against core's source, so they don't depend on a fresh `pnpm build`.
                resolve: {
                    alias: {
                        '@calends/core': fileURLToPath(
                            new URL('packages/core/src/index.ts', import.meta.url),
                        ),
                    },
                },
                test: {
                    name: 'vue',
                    include: ['packages/vue/src/**/*.test.ts'],
                    environment: 'happy-dom',
                },
            },
        ],
    },
});
