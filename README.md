# Calends

Headless calendar for Vue: a framework-free core built on native `Temporal`, and unstyled Vue
primitives that expose their state as data attributes. It ships no CSS, so you style it with
Tailwind (or anything else) against `data-today`, `data-outside`, `data-highlighted`, and friends.

| Package                                 | What it is                                                                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@calends/core`](packages/core#readme) | Plain TS. Month grid, time grid, resource, timeline, and Gantt layouts; navigation; drag/resize date math. No Vue imports.                                |
| [`@calends/vue`](packages/vue#readme)   | Headless Vue primitives (`CalendarRoot`, `MonthGrid`, `TimeGrid`, `ResourceGrid`, `Timeline`, `Gantt`, …) and `useCalendar`. Peer deps: `vue`, `reka-ui`. |

Requires a runtime with native `Temporal`. No polyfill is bundled.

## Development

```sh
pnpm install
pnpm test        # vitest, core
pnpm typecheck
pnpm build       # core first, then vue
pnpm format      # prettier (format:check to verify)
```

Releases use changesets. Add one with `pnpm changeset` alongside the change. On `main`, the Release
workflow keeps a "Version Packages" pull request up to date, and merging it publishes to npm from CI
with provenance.

## License

MIT
