import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [vue()],
    build: {
        lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
        sourcemap: true,
        rolldownOptions: {
            external: ['vue', 'reka-ui', '@calends/core'],
        },
    },
});
