---
outline: [2, 3]
---

<script setup>
import ResourceDemo from '../demos/ResourceDemo.vue';
</script>

# Resources

One row per resource (a technician, a room, a machine) across the days of a week or a month. Each
row shows how busy that resource is and flags days it's double-booked.

<ClientOnly>
    <ResourceDemo />
</ClientOnly>

This is the **`ResourceCalendar` recipe**. Drag a job along its row to change its days, or up or
down to give it to someone else. Riley has two jobs at once today, so that cell and row are marked
as double-booked. Avery has two jobs today too, but at different times, so she's only busy.

::: details The recipe's source
<<< @/../recipes/ResourceCalendar.vue
:::

## Resources and events

```vue
<CalendarRoot
    view="week"
    :events="jobs"
    :resources="technicians"
    :get-resource-ids="(job) => job.techs"
    unassigned
/>
```

- **`resources`** is any list of objects with an `id`. Rows keep its order, and a resource with no
  events still gets a row.
- **`get-resource-ids`** returns which resources an event belongs to. An event with several shows in
  each of their rows.
- **`unassigned`** adds a last row, with a `null` resource, for events whose ids match none of
  `resources`.
- **`view`** is `week` or `month`. Unlike the month view, a resource grid shows only the period's own
  days.

## Anatomy

```vue
<ResourceGrid v-slot="{ days, rows }">
    <ResourceDayHeader v-for="day in days" :day="day" />

    <ResourceRow v-for="(row, rowIndex) in rows" :row="row">
        <ResourceLabel :row="row" />

        <ResourceCell
            v-for="cell in row.cells"
            :cell="cell"
            :row-index="rowIndex"
            :resource-id="row.resource?.id ?? null"
        >
            <EventBar
                v-for="segment in cell.segments"
                :segment="segment"
                :resource-id="row.resource?.id ?? null"
            />
        </ResourceCell>
    </ResourceRow>
</ResourceGrid>
```

| Primitive           | Renders                                  | Notes                                                                                                                     |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `ResourceGrid`      | `role="grid"`, labelled with the title   | Owns keyboard navigation and sets `--day-count`. Slot: `grid`, `days`, `rows`.                                            |
| `ResourceDayHeader` | `role="columnheader"`                    | Slot props `day` and `weekday`.                                                                                           |
| `ResourceRow`       | `role="row"`                             | Sets `--row-lanes`, and `data-idle`, `data-overlap`, or `data-unassigned`.                                                |
| `ResourceLabel`     | `role="rowheader"`                       | Slot props `resource`, `busy-days`, and `overlap-days`.                                                                   |
| `ResourceCell`      | `role="gridcell"`, one tab stop per grid | Needs `row-index`, and `resource-id` so drops and selections know the row. Pass `resource-label` for its accessible name. |
| `EventBar`          | The bar, as in the month view            | Pass `resource-id` so moving it can change rows.                                                                          |

Each cell has `eventCount` and `hasOverlap`, and each row has `busyDays` (days with any event) and
`overlapDays` (days where a cell `hasOverlap`), for summaries like "3 days booked · 1 double-booked".

Two timed events on the same day only overlap when their times do, so a morning job and an afternoon
job leave the day busy but not double-booked. Back-to-back jobs don't overlap either, since an end time
is exclusive. An all-day event overlaps anything else on its days.

## Keyboard

| Keys                     | Does                                        |
| ------------------------ | ------------------------------------------- |
| Left / Right             | Previous or next day, paging past the ends. |
| Up / Down                | Previous or next row.                       |
| Home / End               | First or last day of the period.            |
| Ctrl + Home / Ctrl + End | First or last row.                          |
| Page Up / Page Down      | Previous or next week (or month).           |

With `editable`, Space picks a focused event up. Left and Right move it a day, Up and Down move it
to the previous or next row, Shift with Left or Right changes its end, and Space drops it.

## Interactions

When a drop lands in another row, `event-drop` also carries `resourceId` and `previousResourceId`
(either can be `null` for the unassigned row). Only the row it left changes: an event that belongs to
several resources keeps the others, so your app should swap `previousResourceId` for `resourceId`
in its own list.

`range-select` carries the `resourceId` of the row it was made in.
