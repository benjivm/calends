# Getting started

Calends is two packages:

- **`@calends/core`** is plain TypeScript: layouts, navigation, and the date math behind drag and
  resize. It imports no framework.
- **`@calends/vue`** is the headless Vue primitives built on it.

```sh
npm install @calends/vue @calends/core reka-ui
```

`vue` 3.5+ and `reka-ui` 2.11+ are peer dependencies. Only reka-ui's `Primitive` is used, for
`as-child`.

## Requirements

- **Native `Temporal` at runtime.** No polyfill is bundled. If you support browsers without it, load
  a polyfill yourself before the calendar runs. Without one, `CalendarRoot` throws an error that
  says so.
- **TypeScript 6.0 or later** for types, with `ESNext` (or `esnext.temporal`) in `lib`. The
  `Temporal` types come from TypeScript's own lib, which first has them in 6.0, rather than from a
  copy Calends ships. Plain JavaScript projects don't need it.

To polyfill only where it's needed, load one before your app mounts:

```ts
if (typeof Temporal === 'undefined') {
    await import('temporal-polyfill/global');
}
```

## A first calendar

`CalendarRoot` holds the state and provides it to every primitive inside it. The primitives render
the structure and ARIA roles and expose state as data attributes. You supply the markup's styling.

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

That's a working month view. For a finished one, start from a [recipe](/guide/theming): a styled,
copy-in component built on these primitives, like the one on the [month view](/views/month) page.

## Events

Pass any objects with an `id` and a `start`. Extra fields (like `title`) are left alone and come back
to you as `event.source`.

| Field    | Type                                    | Notes                                                                |
| -------- | --------------------------------------- | -------------------------------------------------------------------- |
| `id`     | `string \| number`                      | Required, and unique.                                                |
| `start`  | ISO string, `Date`, or a Temporal value | Required.                                                            |
| `end`    | Same as `start`, optional               | Inclusive last day for all-day events, exclusive end for timed ones. |
| `allDay` | `boolean`, optional                     | Defaults to true when `start` is a date with no time.                |

Strings with an offset or `Z` are instants, moved into the calendar's time zone. Strings without one
are wall-clock times already in it. A timed event that ends exactly at midnight doesn't spill into
the next day.

Calends doesn't expand recurring events. Pass the instances you want shown, for the range in view.
The month grid pads its weeks with days from the months either side, so pad the range by a week:

```ts
import { computed } from 'vue';
import { periodRange } from '@calends/core';

const events = computed(() => {
    const { start, end } = periodRange(date.value, 'month');
    const standups = [];

    for (
        let day = start.subtract({ days: 6 });
        Temporal.PlainDate.compare(day, end.add({ days: 6 })) <= 0;
        day = day.add({ days: 1 })
    ) {
        if (day.dayOfWeek === 1) {
            const at = day.toPlainDateTime('09:00');

            standups.push({
                id: `standup-${day}`,
                title: 'Standup',
                start: at.toString(),
                end: at.add({ minutes: 15 }).toString(),
            });
        }
    }

    return [...oneOffEvents.value, ...standups];
});
```

For RRULE strings, a library like `rrule` does the same job: expand the rule between the range's
ends, and give each instance its own `id`.

## `CalendarRoot` props

| Prop               | Type                                    | Default            | What it does                                                                                                      |
| ------------------ | --------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `v-model:date`     | `Temporal.PlainDate`                    | today              | Any day in the period shown.                                                                                      |
| `events`           | `readonly T[]`                          | `[]`               | See [Events](#events).                                                                                            |
| `view`             | `'month' \| 'week' \| 'day'`            | `'month'`          | The period navigation pages by.                                                                                   |
| `week-starts-on`   | `1`–`7` (ISO: 1 is Monday, 7 is Sunday) | `7`                |                                                                                                                   |
| `time-zone`        | IANA zone string                        | the runtime's zone | Where timed events are placed.                                                                                    |
| `locale`           | BCP 47 string                           | the runtime's      | For titles, weekday names, and labels.                                                                            |
| `today`            | `Temporal.PlainDate`                    | from `now`         | Override for `data-today`, past events, and the today button.                                                     |
| `now`              | `Temporal.ZonedDateTime`                | the clock          | Override for the current time, for the now line and past timed events. See [Server rendering](#server-rendering). |
| `fixed-weeks`      | `boolean`                               | `false`            | Always draw six weeks in the month grid.                                                                          |
| `max-lanes`        | `number`                                | unlimited          | Lanes per month week, counting the "+N more" lane.                                                                |
| `resources`        | `readonly { id }[]`                     |                    | Rows for the resource and timeline views.                                                                         |
| `get-resource-ids` | `(event: T) => ids`                     |                    | Which resources an event belongs to.                                                                              |
| `unassigned`       | `boolean`                               | `false`            | Adds a row for events that match no resource.                                                                     |
| `slot-min-minutes` | `number`                                | `0`                | Start of the time grid and timeline's daily window, in minutes from midnight.                                     |
| `slot-max-minutes` | `number`                                | `1440`             | End of that window.                                                                                               |
| `slot-minutes`     | `number`                                | `60`               | Minutes per timeline header slot.                                                                                 |
| `gantt-scale`      | `'day' \| 'week' \| 'month'`            | `'week'`           | Column width of the Gantt view.                                                                                   |
| `gantt-links`      | `readonly { id, from, to, kind? }[]`    |                    | Dependency and related lines between Gantt rows.                                                                  |
| `editable`         | `boolean`                               | `false`            | Lets events be moved and resized.                                                                                 |
| `selectable`       | `boolean`                               | `false`            | Lets people drag across empty space to select a range.                                                            |
| `snap-minutes`     | `number`                                | `15`               | What timed drags and selections snap to.                                                                          |
| `can-edit`         | `(event: T) => boolean`                 | all events         | Limits editing to some events.                                                                                    |
| `as` / `as-child`  |                                         | `'div'`            | The rendered element, as in Reka UI.                                                                              |

It emits `event-drop`, `event-resize`, and `range-select`. The calendar never changes `events`:
your app applies the change, then passes the updated events back in.

On touch, both start with a long press (half a second), so a swipe across the calendar still scrolls
the page. While dragging or selecting, bringing the pointer near the edge of a scroll container (the
time grid's hours, a wide timeline, or the page itself) scrolls it.

`selectable` and `editable` are independent. `range-select` only reports the days or times that were
picked, which suits read-only uses like opening a booking form or filtering a report. If your app turns
a selection into a new event, that's an edit, so check `editable` (or your own permissions) first.
The detail's `start` and `end` are valid event times as they are:

```ts
import type { RangeSelectDetail } from '@calends/vue';

function createEvent({ start, end, allDay }: RangeSelectDetail) {
    if (!canEdit.value) return;

    events.value = [
        ...events.value,
        { id: crypto.randomUUID(), title: 'New event', start, end, allDay },
    ];
}
```

```html
<CalendarRoot
    :events="events"
    selectable
    @range-select="createEvent"
></CalendarRoot>
```

## Server rendering

By default, the current time comes from the rendering machine's clock and time zone, so a server
and a browser can disagree about today, which events are past, and where the now line sits. To
hydrate cleanly, pass `time-zone` and a `now` the server and the client share, or render the
calendar on the client only. `today` and the starting `date` follow `now` unless you set them.

With Nuxt, for example, `useState` carries the server's value to the client:

```ts
const timeZone = 'America/Chicago';
const nowIso = useState('calendar-now', () => Temporal.Now.zonedDateTimeISO(timeZone).toString());
const now = computed(() => Temporal.ZonedDateTime.from(nowIso.value));

const tick = () => (nowIso.value = Temporal.Now.zonedDateTimeISO(timeZone).toString());
let timer: ReturnType<typeof setInterval>;

onMounted(() => {
    tick();
    timer = setInterval(tick, 60_000);
});
onUnmounted(() => clearInterval(timer));
```

```html
<CalendarRoot
    :time-zone="timeZone"
    :now="now"
></CalendarRoot>
```

`now` replaces the clock, so the calendar stops ticking on its own. The update after mounting keeps
the now line moving.
