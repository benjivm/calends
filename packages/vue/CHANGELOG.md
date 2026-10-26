# @calends/vue

## 0.2.0

### Minor Changes

- 717e2e6: Double-bookings in the resource view are now time-aware. Two timed events on the same day only count (`hasOverlap`, `overlapDays`, and `data-overlap`) when their times overlap, so a morning job and an afternoon job no longer show as double-booked. All-day events still overlap anything on their days. Resource cells have a new `hasOverlap` field.

### Patch Changes

- 2587e71: Clicking "+N more" (or any button, link, or form field inside a day) no longer starts a range selection when `selectable` is on.
- Updated dependencies [717e2e6]
    - @calends/core@0.2.0

## 0.1.0

### Minor Changes

- 907217e: Initial release: headless month, time grid, resource, timeline, and Gantt layouts on native Temporal, with unstyled Vue primitives, drag, resize, range select, and keyboard moves.

### Patch Changes

- Updated dependencies [907217e]
    - @calends/core@0.1.0
