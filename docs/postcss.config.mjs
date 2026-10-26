import { postcssIsolateStyles } from 'vitepress';

// VitePress's styles are unlayered, so they beat Tailwind's layers. This keeps them out of `.vp-raw`.
export default {
    plugins: [postcssIsolateStyles({ includeFiles: [/vp-doc\.css/, /base\.css/] })],
};
