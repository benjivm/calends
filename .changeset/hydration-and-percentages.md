---
'@calends/core': minor
'@calends/vue': minor
---

- `CalendarRoot` takes a `now` prop that replaces the clock, so a server and a browser can render the same now line and past events. `today` and the starting `date` follow it, and the starting `date` now honors `today` and `time-zone`.
- Time-positioned primitives expose ready-made percentages: `--event-offset` and `--event-length` on `TimeEvent` and `TimelineEvent`, `--selection-offset` and `--selection-length` on the selections, `--now-offset` on `NowIndicator` and `TimelineNow`, `--bar-offset` and `--bar-length` on `GanttBar`, and `--today-offset` and `--today-length` on `GanttToday`. The minute and day properties are unchanged.
- Without `Temporal`, the calendar throws an error that points at the polyfill docs instead of a bare `ReferenceError`. Core exports the check as `assertTemporal`.
