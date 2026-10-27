# Calends

Headless calendar for Vue: `@calends/core` (plain TS on native `Temporal`) and `@calends/vue`
(unstyled primitives, peer dep `vue`). Two private workspace packages sit beside them:
`recipes/` (styled, copy-in components built on the primitives) and `docs/` (the VitePress site, deployed
to GitHub Pages at `benjivm.github.io/calends`).

Read `notes/roadmap.md` before planning work: it has the architecture, what's built, the remaining M4 extraction
steps, the backlog, and open questions. `notes/alternatives.md` explains why this exists. `reference/` holds
styled recipes and real-world usage (reference only, not built). Both folders are gitignored and may be absent.

## Commands

```sh
pnpm install
pnpm test        # vitest projects: core (node) and vue (happy-dom); --project vue to run one
pnpm typecheck   # tsc for core, vue-tsc for vue, docs, and recipes, all strict
pnpm build       # the two packages: core first, then vue (vue resolves core from its dist)
pnpm docs:dev    # VitePress, with @calends/* aliased to source so library edits hot-reload
pnpm docs:build  # what CI and the Pages deploy run
pnpm format      # prettier --write (format:check to verify)
pnpm changeset   # record a change for release
```

Run `pnpm build` after changing core if you're type-checking or building vue, since vue reads core's `dist` types.

A new dependency with an install script needs an `allowBuilds` entry in `pnpm-workspace.yaml`. Locally pnpm only warns
about it, but in CI (`CI=true`) the install fails with `ERR_PNPM_IGNORED_BUILDS`. Check with `CI=true pnpm install`.

## Recipes and docs

- **Recipes are Tailwind v4 against shadcn-vue's theme tokens** (`bg-card`, `text-muted-foreground`,
  `bg-primary`, `border-border`, `ring-ring`, …), so they match any shadcn-vue app with no setup. Use only
  those tokens (plus Tailwind's `red`/`green` for the now line and status, which mean the same in every theme), keep shadcn's exact values in `docs/.vitepress/theme/style.css`, write explicit `border-border`
  (Tailwind's preflight defaults borders to `currentColor`), and import nothing but `@calends/*`, `vue`, and
  `reka-ui`. Icons are inline SVG. Recipes are generic over their event type, like `CalendarRoot`.
- **Recipes are a shadcn-vue registry.** They live in `recipes/calendar/` (the CLI installs them to
  `@/components/calendar/`), and each needs an entry in `recipes/registry.json`, listing every file it imports.
  The docs build writes it to `/calends/r/` (`docs/.vitepress/registry.ts`).
- **The no-CSS rule is for the packages.** Recipes are styled by definition, but still with utilities, not
  `<style>` blocks.
- **Demos go in `.calendar-demo vp-raw`** inside `<ClientOnly>` (they depend on the clock). VitePress's styles are
  unlayered and beat Tailwind's layers, so `postcssIsolateStyles` keeps them out of `.vp-raw`, and the demo
  container gets a scoped preflight. Popovers portal to `<body>`; the preflight covers
  `[data-reka-popper-content-wrapper]` too.
- **Every attribute and variable a primitive renders belongs in `docs/guide/styling.md`.** Update it with the
  component.

## Architecture rules

- **Core never imports Vue**, the DOM, or anything app-specific. It's pure functions over Temporal values. Keep it
  that way so a second framework binding stays possible.
- **Native `Temporal` only.** No polyfill, no `Date` math inside core (accept `Date`/ISO strings only at the input
  boundary in `events.ts`). All-day events are `PlainDate`; timed events are `ZonedDateTime`. Time grids place by
  wall-clock minutes, so a DST day still draws 24 hours.
- **Ship no CSS.** No `<style>` blocks in any `.vue` file, scoped or not. Expose state as data attributes
  (`data-today`, `data-outside`, `data-weekend`, `data-selected`, `data-highlighted`, `data-continues-before`,
  `data-dragging`, …) and layout as CSS custom properties (`--event-span`, `--event-lane`, `--day-count`, …).
  The only inline styles allowed are layout variables and the visually-hidden live region.
- **Primitives are Reka-style:** `as-child` via the package's own `Primitive` (adapted from reka-ui's, so reka-ui is only a recipe dependency), slots everywhere, `v-model:date`/`v-model:view`.
  Event primitives (`EventBar`, `TimeEvent`, `TimelineEvent`, `GanttBar`) render their own wrapper instead of
  `as-child`, so `EventResizeHandle` can sit inside them.
- **Interactions emit intent.** Drag, resize, and select emit `event-drop`, `event-resize`, and `range-select`; the
  app commits. Never mutate the `events` prop. Drag previews work by swapping the dragged event before layout.
- **Accessibility is part of the feature:** ARIA grid pattern, roving focus, arrow/PageUp/PageDown/Home/End keys, and
  live-region announcements for keyboard moves. Events stay inside their gridcell in the DOM.

## Conventions

- TypeScript `strict`. Vue SFCs use `<script setup lang="ts">`; generic components use `generic="T extends ..."`.
- Formatting is Prettier (`.prettierrc`): run `pnpm format` before finishing, and `pnpm format:check` must pass.
  Imports sort `vue` → scoped packages → third party → relative.
- Comments: only gotchas, fragility, or the non-obvious why. Don't restate the code, don't record history ("now
  uses", "previously"), no section banners. Prefer a better name over a comment. JSDoc on exported options and props
  is welcome where the name alone doesn't say it.
- Use the Oxford comma in docs, comments, and UI copy.
- Tests: Vitest. Core tests sit next to the file (`month.ts` → `month.test.ts`). Cover DST, `weekStartsOn`,
  multi-week slicing, and layout edge cases. Vue tests sit next to the component or composable and mount real
  calendars from `src/test-harness.ts` (excluded from the build). happy-dom has no layout: drag tests say what's
  under the pointer with `pointerOver`, and time columns get a rect from `layOutMinutes`. Tests import core
  from source, so they don't need a build first.
- Releases: every user-facing change gets a changeset. Both packages are versioned together. CI keeps a "Version
  Packages" PR open; merging it publishes (`.github/workflows/release.yml`). Don't run `pnpm release` locally.
