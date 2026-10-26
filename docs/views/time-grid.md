---
outline: [2, 3]
---

<script setup>
import TimeGridDemo from '../demos/TimeGridDemo.vue';
</script>

# Time grid

A week or a day of hours, with all-day events in a row above them. Overlapping events share the
column width, and an overnight event is split across the days it covers.

<ClientOnly>
    <TimeGridDemo />
</ClientOnly>

This is the **`TimeGridCalendar` recipe**. Drag an event to move it, drag its top or bottom edge to
change its times, or click or drag across empty hours to select a range. The red line marks the
current time.

::: details The recipe's source
<<< @/../recipes/TimeGridCalendar.vue
:::

## Anatomy

```vue
<CalendarRoot view="week" :events="events" :slot-min-minutes="7 * 60" :slot-max-minutes="19 * 60">
    <TimeGrid v-slot="{ days, allDay, hours }">
        <EventBar v-for="segment in allDay.segments" :segment="segment" />

        <TimeColumn v-for="day in days" :day="day">
            <TimeEvent v-for="layout in day.events" :layout="layout">
                <EventResizeHandle edge="start" />
                <EventResizeHandle edge="end" />
            </TimeEvent>

            <TimeSelection :day="day" />
            <NowIndicator :day="day" />
        </TimeColumn>
    </TimeGrid>
</CalendarRoot>
```

| Primitive       | Renders                                     | Notes                                                                                                    |
| --------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `TimeGrid`      | `role="group"`, labelled with the title     | Sets `--day-count`, `--window-minutes`, and `--all-day-lanes`. Slot: `grid`, `days`, `all-day`, `hours`. |
| `TimeColumn`    | `role="group"`, labelled with the full date | One day's hours, and the drop target for timed drags.                                                    |
| `TimeEvent`     | One day's piece of a timed event            | Sets `--event-start`, `--event-end`, `--event-column`, and `--event-columns`.                            |
| `EventBar`      | An all-day event in the all-day row         | The same primitive as the month view, placed with `--event-column` and `--event-span`.                   |
| `TimeSelection` | Only in the day being selected              | Sets `--selection-start` and `--selection-end`.                                                          |
| `NowIndicator`  | Only in today's column, inside the window   | Sets `--now`.                                                                                            |

`view` picks the period: `week` shows seven columns from `week-starts-on`, and `day` shows one. The
`hours` slot prop lists each whole hour in the window, as minutes from midnight, for the gutter
labels.

## Placing events

Every minute value is counted from the top of the visible window, so with the grid's
`--window-minutes` an event's position is a percentage:

```css
top: calc(var(--event-start) / var(--window-minutes) * 100%);
height: calc((var(--event-end) - var(--event-start)) / var(--window-minutes) * 100%);
```

- **Overlaps:** events that overlap, directly or through a chain, form a cluster. Each takes the
  first free column in its cluster (`--event-column`), and the whole cluster shares
  `--event-columns`.
- **Overnight events** are split at midnight. The first piece gets `data-ends-after` and the next
  gets `data-starts-before`. An event that ends exactly at midnight stays on one day.
- **The window:** `slot-min-minutes` and `slot-max-minutes` set the hours drawn. Parts of an event
  outside them are clipped (and marked `data-starts-before` or `data-ends-after`), and an event
  entirely outside them isn't drawn.
- **Daylight saving:** events are placed by wall-clock time, so the day the clocks change still
  draws 24 hours, and a 9:00 event sits at 9:00.

The all-day row in the recipe is plain markup with `data-drop="day"` and `data-date` on each cell,
which is what lets all-day bars be dragged along it.

## Keyboard

The time grid has no cell-by-cell navigation yet: Tab moves between events. With `editable`, a
focused event can be moved without a pointer:

| Keys           | Does                                                 |
| -------------- | ---------------------------------------------------- |
| Space          | Picks the event up.                                  |
| Left / Right   | Moves it a day.                                      |
| Up / Down      | Moves it earlier or later by `snap-minutes`.         |
| Shift + arrows | Moves its end instead, to make it longer or shorter. |
| Space or Enter | Drops it, emitting `event-drop` (or `event-resize`). |
| Escape         | Puts it back.                                        |

## Interactions

Timed drags and selections snap to `snap-minutes` (15 by default). A timed event's `start` and
`end` in `event-drop` and `event-resize` are `Temporal.ZonedDateTime` in the calendar's time zone,
moved by wall-clock time.

A range selection stays within the day it starts in, and `range-select` reports `allDay: false`
with zoned `start` and `end`. Selecting in the all-day row reports whole days instead.
