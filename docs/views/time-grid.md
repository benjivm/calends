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

| Primitive       | Renders                                                         | Notes                                                                                                             |
| --------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `TimeGrid`      | `role="group"`, labelled with the title                         | Sets `--day-count`, `--window-minutes`, and `--all-day-lanes`. Slot: `grid`, `days`, `all-day`, `hours`.          |
| `TimeColumn`    | `role="group"`, labelled with the full date and its event count | One day's hours, and the drop target for timed drags. Takes roving focus, with `data-focused`.                    |
| `TimeEvent`     | One day's piece of a timed event                                | Sets `--event-offset`, `--event-length`, `--event-start`, `--event-end`, `--event-column`, and `--event-columns`. |
| `EventBar`      | An all-day event in the all-day row                             | The same primitive as the month view, placed with `--event-column` and `--event-span`.                            |
| `TimeSelection` | Only in the day being selected                                  | Sets `--selection-offset`, `--selection-length`, `--selection-start`, and `--selection-end`.                      |
| `NowIndicator`  | Only in today's column, inside the window                       | Sets `--now-offset` and `--now`.                                                                                  |

`view` picks the period: `week` shows seven columns from `week-starts-on`, and `day` shows one. The
`hours` slot prop lists each whole hour in the window, as minutes from midnight, for the gutter
labels.

## Placing events

`--event-offset` and `--event-length` are percentages of the visible window, so they place an event
as they are:

```css
top: var(--event-offset);
height: var(--event-length);
```

The minute values behind them (`--event-start` and `--event-end`) count from the top of the window,
against the grid's `--window-minutes`.

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

Tab reaches one day column, the focused day. From there:

| Keys              | Does                                                       |
| ----------------- | ---------------------------------------------------------- |
| Left / Right      | Moves to the previous or next day, paging past the period. |
| Home / End        | Moves to the first or last day shown.                      |
| PageUp / PageDown | Moves a period back or forward.                            |
| Down / Up         | Enters the day's first or last event.                      |

From a focused event, Down and Up step through that day's events (Up from the first goes back to
the day), and Left and Right move to the previous or next day. Keys pressed elsewhere inside an
event, like in an input, are left alone. The all-day row's events are still reached with Tab.

With `editable`, a focused event can also be moved without a pointer:

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
