---
outline: [2, 3]
---

<script setup>
import GanttDemo from '../demos/GanttDemo.vue';
</script>

# Gantt

One row per task across a continuous date axis, zoomable by day, week, or month, with dependency
lines between rows.

<ClientOnly>
    <GanttDemo />
</ClientOnly>

This is the **`GanttCalendar` recipe**. Drag a bar to move it or stretch either edge, switch the
zoom, and hover a bar to light up its links. A name that doesn't fit inside its bar goes beside it.

::: details The recipe's source
<<< @/../recipes/GanttCalendar.vue
:::

## Rows and the axis

```vue
<CalendarRoot :events="projects" gantt-scale="week" :gantt-links="links" />
```

- **Rows keep the order of `events`**, one each. Sort them however your app wants.
- **`gantt-scale`** is `day`, `week`, or `month`: the width of a header column. The tier above it is
  months (or years, at month scale).
- **The axis fits the events**, padded (seven days, two weeks, or a month, by scale) and snapped to
  whole columns. While a bar is dragged, the axis stays fitted to where the events were, so it doesn't
  shift under the pointer.
- Gantt rows are measured in **days**, so moves and resizes go by whole days.

## Links

```ts
const links = [
    { id: 1, from: 'design', to: 'build' }, // a dependency
    { id: 2, from: 'build', to: 'docs', kind: 'related', label: 'shares copy' },
];
```

- **A dependency** (the default `kind`) runs from the end of `from` to the start of `to`. When `to`
  starts before `from` ends, the link has `conflict: true`, and the recipe draws it red.
- **A related link** has no direction. It's drawn from whichever row starts first, and the recipe
  dashes it with no arrow.
- **A `label`** is text drawn on the line, such as a link type from your tracker ("blocks").
- Links whose `from` or `to` aren't in `events` are dropped.

`GanttLinks` is an SVG overlay that measures the rendered bars, so it follows zoom, row height, and
drag previews without any geometry of yours. A line leaves through the predecessor's top or bottom
edge, as late in the bar as leaves room to turn into the successor, so it never crosses a name drawn
beside the bar. Its slot gives each link's `path` and `arrow` (SVG path data), `labelPoint` (where a
right-aligned `link.label` ends, just before the arrow), plus `highlighted` and `dimmed` while a bar
is hovered or focused. Place it over the rows, inside the scrolling content. For custom drawing, the
core exports `routeGanttLink`, `roundedPath`, and `ganttLinkArrow`.

## Anatomy

```vue
<Gantt v-slot="{ gantt, rows, columns, groups }">
    <GanttRow v-for="row in rows" :row="row">
        <GanttTrack>
            <GanttBar :row="row">
                <EventResizeHandle edge="start" />
                <EventResizeHandle edge="end" />
            </GanttBar>
        </GanttTrack>
    </GanttRow>

    <GanttLinks v-slot="{ links }" />
    <GanttToday />
</Gantt>
```

| Primitive    | Renders                        | Notes                                                                                   |
| ------------ | ------------------------------ | --------------------------------------------------------------------------------------- |
| `Gantt`      | `role="group"`                 | Sets `--axis-days` and `data-scale`. Slot: `gantt`, `rows`, `columns`, `groups`.        |
| `GanttRow`   | `role="group"`                 | One task's row. `GanttLinks` finds rows through it.                                     |
| `GanttTrack` | The row's day axis             | Drops are measured against its width, so give it the full axis.                         |
| `GanttBar`   | The task's bar                 | Sets `--bar-start` and `--bar-end`, in days from the axis start (the end is exclusive). |
| `GanttLinks` | An `<svg>`                     | Props `gap`, `radius`, and `arrow-size`, in pixels.                                     |
| `GanttToday` | Only when today is on the axis | Sets `--today`, in days from the axis start.                                            |

Each column and group has `offset` and `days` (clipped to the axis), and day columns have
`isToday` and `isWeekend`.

## Keyboard

With `editable`, Space picks a focused bar up, Left and Right move it a day, Shift with Left or
Right changes its end, Space drops it, and Escape puts it back.
