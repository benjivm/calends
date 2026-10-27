# @calends/vue

## 0.4.0

### Minor Changes

- c8b3dd2: `reka-ui` is no longer a peer dependency. `as` and `as-child` work as before, through the package's own `Primitive`, and `@calends/vue` exports its `PrimitiveProps` and `AsTag` types. You can uninstall `reka-ui` unless something else in your app (like the recipes' "+N more" popover) uses it.
- c2a9cef: - `CalendarRoot` takes a `now` prop that replaces the clock, so a server and a browser can render the same now line and past events. `today` and the starting `date` follow it, and the starting `date` now honors `today` and `time-zone`.
    - Time-positioned primitives expose ready-made percentages: `--event-offset` and `--event-length` on `TimeEvent` and `TimelineEvent`, `--selection-offset` and `--selection-length` on the selections, `--now-offset` on `NowIndicator` and `TimelineNow`, `--bar-offset` and `--bar-length` on `GanttBar`, and `--today-offset` and `--today-length` on `GanttToday`. The minute and day properties are unchanged.
    - Without `Temporal`, the calendar throws an error that points at the polyfill docs instead of a bare `ReferenceError`. Core exports the check as `assertTemporal`.
- 0f7b24f: The time grid has keyboard navigation. `TimeColumn` takes roving focus (with `data-focused`, `aria-current` on today, and its event count in the label): Left and Right change day and page past the period, Home and End go to its ends, PageUp and PageDown page it, and Down or Up enter the day's events. From an event, Up and Down step through the day's events and Left and Right go to the next day. The `TimeGridCalendar` recipe draws a focus ring on the focused day.

### Patch Changes

- Updated dependencies [c2a9cef]
    - @calends/core@0.4.0

## 0.3.0

### Minor Changes

- 43f17f9: Gantt links now leave through the predecessor's top or bottom edge instead of its end, so a line no longer runs through a name drawn beside a short bar. `routeGanttLink` takes the two bars' boxes (`{ left, right, top, bottom }`) instead of two points. Links take an optional `label`, and `GanttLinks` gives each one a `labelPoint` where a right-aligned label ends, just before the arrow. The `GanttCalendar` recipe draws it.
- 36a10be: Touch can now move, resize, and select. A long press (half a second) picks up an event or starts a range selection, so a swipe that starts on the calendar still scrolls the page. While the touch is held it doesn't scroll, select text, or open the context menu, and a second finger is ignored. Dragging or selecting near the edge of a scroll container, or the page, now scrolls it, for mouse and pen too, so an event can reach hours or days outside the visible part of the time grid, timeline, Gantt, or resource view. The recipes widen their resize handles on coarse pointers and turn off the iOS long-press callout on editable events.

### Patch Changes

- Updated dependencies [43f17f9]
    - @calends/core@0.3.0

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
