# @calends/core

The framework-free core of [Calends](https://github.com/benjivm/calends), a headless calendar. It is
plain functions over native `Temporal` values: month, time grid, resource, timeline, and Gantt
layouts, period navigation, and the date math behind drag and resize. It imports no framework and
touches no DOM. For Vue components on top of it, use [`@calends/vue`](https://www.npmjs.com/package/@calends/vue).

```sh
npm install @calends/core
```

## Requirements

- A runtime with native `Temporal`. No polyfill is bundled.
- For types, TypeScript 6.0 or later with `ESNext` (or `esnext.temporal`) in `lib`.

## Example

```ts
import { createMonthGrid, normalizeEvents } from '@calends/core';

const events = normalizeEvents(
    [
        { id: 1, start: '2026-10-12', end: '2026-10-14' },
        { id: 2, start: '2026-10-15T09:00:00', end: '2026-10-15T09:30:00' },
    ],
    { timeZone: 'America/Chicago' },
);

const grid = createMonthGrid({
    date: Temporal.PlainDate.from('2026-10-01'),
    events,
    maxLanes: 4,
});

for (const week of grid.weeks) {
    for (const segment of week.segments) {
        // Day column, days spanned, and stacking lane within the week row.
        console.log(segment.event.id, segment.column, segment.span, segment.lane);
    }
}
```

Event input accepts ISO strings, `Date`, or Temporal values. Date-only starts are all-day events
(`PlainDate`, with an inclusive end day); anything with a time is a timed event (`ZonedDateTime`,
with an exclusive end). Strings with an offset or `Z` are instants moved into `timeZone`; strings
without one are wall-clock times in it.

## What's in it

| Module         | Exports                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `events`       | `normalizeEvent`, `normalizeEvents`, `compareEventStarts`                                          |
| `month`        | `createMonthGrid`, `visibleMonthRange`, `sliceEvents`, `packLanes`                                 |
| `timegrid`     | `createTimeGrid` (overlap columns, overnight splits), `wallMinutes`                                |
| `resources`    | `createResourceGrid` (rows per resource, `busyDays`, `overlapDays`)                                |
| `timeline`     | `createTimeline` (hours across days, rows per resource, hidden hours skipped)                      |
| `gantt`        | `createGantt`, `routeGanttLink`, `roundedPath`, `ganttLinkArrow`                                   |
| `navigation`   | `navigate`, `periodRange`, `isSamePeriod`, `periodTitle`                                           |
| `interactions` | `moveEvent`, `resizeEvent`, `withTimes`, `snapMinutes`, `orderedRange`                             |
| `dates`        | `toZonedDateTime`, `toPlainDate`, `startOfWeek`, `daysBetween`, `isWeekend`, `localTimeZone`, etc. |

Time grids and timelines place events by wall-clock minutes, so a daylight-saving day still draws
24 hours, and a 9:00 event moved across a DST change still starts at 9:00.

## License

MIT
