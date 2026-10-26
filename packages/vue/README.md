# @calends/vue

Headless Vue calendar primitives from [Calends](https://github.com/benjivm/calends): month, week and
day time grid, resource, timeline, and Gantt views, with drag, resize, and range select. They ship no
CSS. State is exposed as data attributes and layout as CSS custom properties, so you style them with
Tailwind (`data-today:…`) or plain attribute selectors.

```sh
npm install @calends/vue @calends/core reka-ui
```

`vue` (3.5+) and `reka-ui` (2.11+) are peer dependencies. Only reka-ui's `Primitive` is used, for
`as-child`.

## Requirements

- A runtime with native `Temporal`. No polyfill is bundled.
- For types, TypeScript 6.0 or later with `ESNext` (or `esnext.temporal`) in `lib`.

## Example

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
    CalendarHeading,
    CalendarNav,
    CalendarRoot,
    EventBar,
    MonthDay,
    MonthGrid,
    MonthWeek,
    MonthWeekday,
} from '@calends/vue';

const date = ref(Temporal.Now.plainDateISO());
const events = [
    { id: 1, title: 'Offsite', start: '2026-10-12', end: '2026-10-14' },
    { id: 2, title: 'Standup', start: '2026-10-15T09:00:00', end: '2026-10-15T09:15:00' },
];
</script>

<template>
    <CalendarRoot
        v-model:date="date"
        :events="events"
        :max-lanes="4"
    >
        <header class="flex items-center gap-2">
            <CalendarNav action="prev">Previous</CalendarNav>
            <CalendarHeading />
            <CalendarNav action="today">Today</CalendarNav>
            <CalendarNav action="next">Next</CalendarNav>
        </header>

        <MonthGrid v-slot="{ weekdays, weeks }">
            <div
                role="row"
                class="grid grid-cols-7"
            >
                <MonthWeekday
                    v-for="weekday in weekdays"
                    :key="weekday.dayOfWeek"
                    :date="weekday"
                />
            </div>

            <MonthWeek
                v-for="week in weeks"
                :key="week.start.toString()"
                :week="week"
                class="grid grid-cols-7"
            >
                <MonthDay
                    v-for="day in week.days"
                    :key="day.date.toString()"
                    :day="day"
                    class="relative min-h-28 data-outside:opacity-50 data-today:font-bold"
                >
                    {{ day.date.day }}

                    <EventBar
                        v-for="segment in day.segments"
                        v-slot="{ event }"
                        :key="segment.event.id"
                        :segment="segment"
                        class="absolute top-[calc(1.75rem+var(--event-lane)*1.5rem)] h-5 w-[calc(var(--event-span)*100%)] data-highlighted:bg-blue-200"
                    >
                        {{ event.source.title }}
                    </EventBar>
                </MonthDay>
            </MonthWeek>
        </MonthGrid>
    </CalendarRoot>
</template>
```

Bars sit inside their start day's gridcell (so the ARIA grid stays intact) and span across with
`--event-span`. Inside the views, events are typed as plain `CalendarEventInput`; read your own
fields from an event primitive's slot (`event.source`), which is typed loosely for that. Every segment of a multi-week event gets `data-highlighted` together on hover or
focus.

## Components

| View        | Primitives                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| Shared      | `CalendarRoot` (`v-model:date`), `CalendarNav`, `CalendarHeading`, `useCalendar`                      |
| Month       | `MonthGrid`, `MonthWeekday`, `MonthWeek`, `MonthDay`, `MonthDayMore`, `EventBar` (alias `MonthEvent`) |
| Time grid   | `TimeGrid`, `TimeColumn`, `TimeEvent`, `TimeSelection`, `NowIndicator`                                |
| Resources   | `ResourceGrid`, `ResourceRow`, `ResourceLabel`, `ResourceCell`, `ResourceDayHeader`                   |
| Timeline    | `Timeline`, `TimelineRow`, `TimelineTrack`, `TimelineEvent`, `TimelineSelection`, `TimelineNow`       |
| Gantt       | `Gantt`, `GanttRow`, `GanttTrack`, `GanttBar`, `GanttToday`, `GanttLinks`                             |
| Interaction | `EventResizeHandle`, `useInteractions`, `useEventState`                                               |

Common data attributes: `data-today`, `data-outside`, `data-weekend`, `data-focused`,
`data-selected`, `data-overflow`, `data-past`, `data-highlighted`, `data-editable`, `data-dragging`,
`data-all-day`, `data-continues-before`, `data-continues-after`, `data-starts-before`, and
`data-ends-after`.

## Interactions

Set `editable` and `selectable` on `CalendarRoot` (with `snap-minutes` and `can-edit` to tune them).
The calendar never changes your `events`. It emits the intent, and you commit it:

- `event-drop` and `event-resize` carry the event, its new `start` and `end`, the previous ones, and
  a `resourceId` when it moved rows.
- `range-select` carries the selected `start`, `end`, `allDay`, and `resourceId`.

The keyboard works too: Space picks an event up, arrows move it, Shift with arrows changes its end,
Space drops it, and Escape cancels. Each move is announced in a live region.

## Server rendering

By default, `today` and the current time come from the rendering machine's clock and time zone, so
a server and a browser can disagree. Pass `time-zone` and `today` to `CalendarRoot` so they match.

## License

MIT
