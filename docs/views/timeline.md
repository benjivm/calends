---
outline: [2, 3]
---

<script setup>
import TimelineDemo from '../demos/TimelineDemo.vue';
</script>

# Timeline

Hours run left to right across a day or a week, with one row per resource. It suits dispatch
boards and room schedules, where the question is who's free when.

<ClientOnly>
    <TimelineDemo />
</ClientOnly>

This is the **`TimelineCalendar` recipe**, showing 6 AM to 10 PM. Drag a job along the hours, drag it
up or down to another technician, or stretch either edge. Overlapping jobs in a row stack into
lanes, and the overnight retrofit runs off the end of the day.

::: details The recipe's source
<<< @/../recipes/TimelineCalendar.vue
:::

## The axis

```vue
<CalendarRoot
    view="day"
    :events="jobs"
    :resources="technicians"
    :get-resource-ids="(job) => job.techs"
    :slot-min-minutes="6 * 60"
    :slot-max-minutes="22 * 60"
    :slot-minutes="60"
/>
```

Each day contributes one window, from `slot-min-minutes` to `slot-max-minutes`, and the hours
outside it aren't drawn. In a week, the seven windows sit end to end, so an overnight job is still
one bar, jumping straight from one day's evening to the next morning.

- **`view`** is `day` or `week`.
- **`slot-minutes`** sets the header slots (60 by default), not the snapping.
- **Without `resources`**, the timeline is a single row holding every event.
- **All-day events** cover their days' whole windows.

## Anatomy

```vue
<Timeline v-slot="{ days, rows }">
    <TimelineRow v-for="row in rows" :row="row">
        <TimelineTrack :row="row">
            <TimelineEvent
                v-for="item in row.items"
                :item="item"
                :resource-id="row.resource?.id ?? null"
            >
                <EventResizeHandle edge="start" />
                <EventResizeHandle edge="end" />
            </TimelineEvent>

            <TimelineSelection :row="row" />
        </TimelineTrack>
    </TimelineRow>

    <TimelineNow />
</Timeline>
```

| Primitive           | Renders                                   | Notes                                                                                                              |
| ------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Timeline`          | `role="group"`, labelled with the title   | Sets `--axis-minutes`, `--window-minutes`, `--slot-minutes`, and `--slot-count`. Slot: `timeline`, `days`, `rows`. |
| `TimelineRow`       | `role="group"`                            | Sets `--row-lanes`, and `data-idle` or `data-unassigned`.                                                          |
| `TimelineTrack`     | The row's time axis                       | Drops and selections are measured against its width, so give it the full axis.                                     |
| `TimelineEvent`     | One event on the axis                     | Sets `--event-start`, `--event-end` (in axis minutes), and `--event-lane`.                                         |
| `TimelineSelection` | Only in the row being selected            | Sets `--selection-start` and `--selection-end`.                                                                    |
| `TimelineNow`       | Only while now is inside a visible window | Sets `--now`, in axis minutes.                                                                                     |

Each entry in `days` has an `offset` (where its window starts on the axis) and `slots` (the header
slot starts, as minutes from midnight), for drawing the header.

Axis minutes turn into position like this:

```css
left: calc(var(--event-start) / var(--axis-minutes) * 100%);
width: calc((var(--event-end) - var(--event-start)) / var(--axis-minutes) * 100%);
```

## Keyboard

With `editable`, Space picks a focused event up. Left and Right move it by `snap-minutes`, Up and
Down move it to the previous or next row, Shift with Left or Right changes its end, Space drops it,
and Escape puts it back.

## Interactions

Drags snap to `snap-minutes`. As in the resource view, a drop in another row adds `resourceId` and
`previousResourceId` to `event-drop`. A selection can cross days in the week view, and
`range-select` reports zoned `start` and `end` with the row's `resourceId`.
