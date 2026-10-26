# Calends

Headless calendar for Vue: `@calends/core` (plain TS on native `Temporal`) and `@calends/vue`
(unstyled primitives, peer deps `vue` and `reka-ui`).

Read `notes/roadmap.md` before planning work: it has the architecture, what's built, the remaining M4 extraction
steps, the backlog, and open questions. `notes/alternatives.md` explains why this exists. `reference/` holds
styled recipes and real-world usage (reference only, not built). Both folders are gitignored and may be absent.

## Commands

```sh
pnpm install
pnpm test        # vitest (core tests in packages/core/src/*.test.ts)
pnpm typecheck   # tsc for core, vue-tsc for vue, both strict
pnpm build       # core first, then vue (vue resolves core from its dist)
pnpm format      # prettier --write (format:check to verify)
pnpm changeset   # record a change for release
```

Run `pnpm build` after changing core if you're type-checking or building vue, since vue reads core's `dist` types.

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
- **Primitives are Reka-style:** `as-child` via reka-ui's `Primitive`, slots everywhere, `v-model:date`/`v-model:view`.
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
  multi-week slicing, and layout edge cases. Vue component tests don't exist yet and are wanted (see roadmap).
- Releases: every user-facing change gets a changeset. Both packages are versioned together.
