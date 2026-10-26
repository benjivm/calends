---
outline: [2, 3]
---

<script setup>
import MonthDemo from '../demos/MonthDemo.vue';
</script>

# Month

A month of weeks, with multi-day events drawn as bars that continue across week rows. Busy weeks can
cap their lanes and fold the rest into "+N more".

<ClientOnly>
    <MonthDemo />
</ClientOnly>

Everything in that demo is the **`MonthCalendar` recipe**, styled with Tailwind against the
[theme tokens](/guide/theming). Drag a bar to move it, drag its edge to resize it, or click or drag
across empty days to create an event. With a bar focused, Space picks it up and the arrow keys move it.
The demo commits each change to local state the way your app would, so turning off `editable` stops new
events too.

::: details The recipe's source
<<< @/../recipes/MonthCalendar.vue
:::

## Anatomy

```vue
<CalendarRoot v-model:date="date" :events="events" :max-lanes="5">
    <MonthGrid v-slot="{ weekdays, weeks }">
        <MonthWeekday v-for="weekday in weekdays" :date="weekday" />

        <MonthWeek v-for="week in weeks" :week="week">
            <MonthDay v-for="day in week.days" :day="day">
                <EventBar v-for="segment in day.segments" :segment="segment">
                    <EventResizeHandle edge="start" />
                    <EventResizeHandle edge="end" />
                </EventBar>

                <MonthDayMore :day="day" />
            </MonthDay>
        </MonthWeek>
    </MonthGrid>
</CalendarRoot>
```

| Primitive      | Renders                                   | Notes                                                                                  |
| -------------- | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| `MonthGrid`    | `role="grid"`, labelled with the title    | Owns keyboard navigation. Its slot gives `grid`, `weekdays`, and `weeks`.              |
| `MonthWeekday` | `role="columnheader"`                     | Slot props `label` ("Mon") and `long-label` ("Monday"), in the calendar's locale.      |
| `MonthWeek`    | `role="row"`                              | Sets `--week-lanes` and `--week-visible-lanes` for sizing the row.                     |
| `MonthDay`     | `role="gridcell"`, one tab stop per grid  | Labelled with the full date and event count. Slot props `segments` and `hidden-count`. |
| `EventBar`     | The bar for one week's piece of an event  | Sets `--event-span` and `--event-lane`. Also exported as `MonthEvent`.                 |
| `MonthDayMore` | A button, only on days with hidden events | Labelled "Show all N events on …". Pair it with a popover of `day.coveringSegments`.   |

`EventBar` renders inside the gridcell of its start day, so `MonthDay` needs `position: relative`
and bars need `position: absolute`. See [Styling](/guide/styling) for every attribute.

## Overflow and "+N more"

Set `max-lanes` to cap how many lanes a week draws, counting the lane that "+N more" takes. A week
that needs more keeps `max-lanes - 1` lanes of bars and hides the rest:

- Each day's `hiddenCount` says how many of its events are hidden, and `MonthDayMore` shows it.
- `day.coveringSegments` lists every event on the day, hidden or not, for the popover.
- A bar that would be the only hidden event on each of its days is drawn in the "+N more" lane
  instead, since "+1 more" would take the same room.

Leave `max-lanes` unset to show every event and let busy weeks grow. `fixed-weeks` always draws six
weeks, so the grid's height doesn't jump between months.

## Keyboard

Focus moves between days like a date picker, and only one day is in the tab order.

| Keys                   | Does                                                    |
| ---------------------- | ------------------------------------------------------- |
| Arrow keys             | Previous or next day, or the same day in the next week. |
| Home / End             | First or last day of the week (`week-starts-on`).       |
| Page Up / Page Down    | Same day in the previous or next month.                 |
| Shift + Page Up / Down | Same day in the previous or next year.                  |

Moving focus out of the month pages the view, and keys pressed inside an event (a link, say) are
left alone.

With `editable`, a focused event can be moved without a pointer:

| Keys           | Does                                                 |
| -------------- | ---------------------------------------------------- |
| Space          | Picks the event up.                                  |
| Left / Right   | Moves it a day.                                      |
| Up / Down      | Moves it a week.                                     |
| Shift + arrows | Moves its end instead, to make it longer or shorter. |
| Space or Enter | Drops it, emitting `event-drop` (or `event-resize`). |
| Escape         | Puts it back.                                        |

Each move is announced through `CalendarRoot`'s live region.

## Interactions

| Event          | Detail                                                                          |
| -------------- | ------------------------------------------------------------------------------- |
| `event-drop`   | `event` (your object), `start`, `end`, `previousStart`, `previousEnd`, `allDay` |
| `event-resize` | The same.                                                                       |
| `range-select` | `start`, `end` (inclusive last day), `allDay`                                   |

In the month view, `start` and `end` are `Temporal.PlainDate` for all-day events. A timed event
dragged to another day keeps its time of day.
