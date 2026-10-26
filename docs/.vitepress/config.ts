import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitepress';

const repo = 'https://github.com/benjivm/calends';
const fromRoot = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

export default defineConfig({
    title: 'Calends',
    description:
        'Headless calendar for Vue: month, time grid, resource, timeline, and Gantt views on native Temporal.',
    base: '/calends/',
    cleanUrls: true,
    lastUpdated: true,
    head: [['meta', { name: 'theme-color', content: '#171717' }]],

    themeConfig: {
        nav: [
            { text: 'Guide', link: '/guide/getting-started' },
            { text: 'Views', link: '/views/month' },
            { text: 'npm', link: 'https://www.npmjs.com/package/@calends/vue' },
        ],
        sidebar: [
            {
                text: 'Guide',
                items: [
                    { text: 'Getting started', link: '/guide/getting-started' },
                    { text: 'Styling', link: '/guide/styling' },
                    { text: 'Theming the recipes', link: '/guide/theming' },
                ],
            },
            {
                text: 'Views',
                items: [
                    { text: 'Month', link: '/views/month' },
                    { text: 'Time grid', link: '/views/time-grid' },
                    { text: 'Resources', link: '/views/resources' },
                    { text: 'Timeline', link: '/views/timeline' },
                    { text: 'Gantt', link: '/views/gantt' },
                ],
            },
        ],
        socialLinks: [{ icon: 'github', link: repo }],
        editLink: { pattern: `${repo}/edit/main/docs/:path`, text: 'Edit this page on GitHub' },
        search: { provider: 'local' },
        outline: [2, 3],
        footer: { message: 'Released under the MIT License.' },
    },

    vite: {
        plugins: [tailwindcss()],
        resolve: {
            // Source, not dist: the docs track the library without a build step, and HMR reaches it.
            alias: {
                '@calends/core': fromRoot('packages/core/src/index.ts'),
                '@calends/vue': fromRoot('packages/vue/src/index.ts'),
                '@recipes': fromRoot('recipes'),
            },
            // The library, recipes, and docs must share one Vue, or provide/inject breaks.
            dedupe: ['vue', 'reka-ui'],
        },
    },
});
