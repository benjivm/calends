import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitepress';
import { writeRegistry } from './registry';

const repo = 'https://github.com/benjivm/calends';
const base = '/calends/';
const fromRoot = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

export default defineConfig({
    title: 'Calends',
    description:
        'Headless calendar for Vue: month, time grid, resource, timeline, and Gantt views on native Temporal.',
    base,
    cleanUrls: true,
    lastUpdated: true,
    // Head tags aren't rewritten for `base`, unlike the logo and hero image.
    head: [
        ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}calends-app-icon.svg` }],
        ['meta', { name: 'theme-color', content: '#121212' }],
    ],

    themeConfig: {
        logo: { light: '/calends-mark.svg', dark: '/calends-mark-dark.svg', alt: 'Calends' },
        nav: [
            { text: 'Guide', link: '/guide/getting-started' },
            { text: 'Views', link: '/views/month' },
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

    buildEnd: ({ outDir }) => writeRegistry(outDir),

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
