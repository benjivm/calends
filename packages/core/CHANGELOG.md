# @calends/core

## 0.4.0

### Minor Changes

- c2a9cef: - `CalendarRoot` takes a `now` prop that replaces the clock, so a server and a browser can render the same now line and past events. `today` and the starting `date` follow it, and the starting `date` now honors `today` and `time-zone`.
    - Time-positioned primitives expose ready-made percentages: `--event-offset` and `--event-length` on `TimeEvent` and `TimelineEvent`, `--selection-offset` and `--selection-length` on the selections, `--now-offset` on `NowIndicator` and `TimelineNow`, `--bar-offset` and `--bar-length` on `GanttBar`, and `--today-offset` and `--today-length` on `GanttToday`. The minute and day properties are unchanged.
    - Without `Temporal`, the calendar throws an error that points at the polyfill docs instead of a bare `ReferenceError`. Core exports the check as `assertTemporal`.

## 0.3.0

### Minor Changes

- 43f17f9: Gantt links now leave through the predecessor's top or bottom edge instead of its end, so a line no longer runs through a name drawn beside a short bar. `routeGanttLink` takes the two bars' boxes (`{ left, right, top, bottom }`) instead of two points. Links take an optional `label`, and `GanttLinks` gives each one a `labelPoint` where a right-aligned label ends, just before the arrow. The `GanttCalendar` recipe draws it.

## 0.2.0

### Minor Changes

- 717e2e6: Double-bookings in the resource view are now time-aware. Two timed events on the same day only count (`hasOverlap`, `overlapDays`, and `data-overlap`) when their times overlap, so a morning job and an afternoon job no longer show as double-booked. All-day events still overlap anything on their days. Resource cells have a new `hasOverlap` field.

## 0.1.0

### Minor Changes

- 907217e: Initial release: headless month, time grid, resource, timeline, and Gantt layouts on native Temporal, with unstyled Vue primitives, drag, resize, range select, and keyboard moves.
