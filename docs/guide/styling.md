# Styling

The primitives ship no CSS. They render the structure, roles, and ARIA attributes, and describe
everything else in two ways:

- **State** as data attributes, present (`data-today=""`) or absent. With Tailwind, style them with
  `data-today:bg-primary`; elsewhere, with `[data-today] { … }`.
- **Layout** as CSS custom properties, like `--event-span` or `--event-start`. The primitives never
  set geometry themselves, so you decide how a bar's span or an event's minutes become `width` and
  `top`.

The only inline styles are those custom properties, and the visually hidden live region on
`CalendarRoot`.

## Patterns

**Events sit inside their cell.** A month bar renders inside the gridcell of the day it starts, and
spans across with `--event-span`, so the ARIA grid stays intact and screen readers find events in
their day. Position bars absolutely in a `relative` cell:

```html
<EventBar
    class="absolute top-[calc(2rem+var(--event-lane)*1.625rem)] h-6 w-[calc(var(--event-span)*100%)]"
/>
```

**Style content from the event's state.** State attributes sit on the event primitive itself. Content
in its slot reads them with Tailwind's `in-*` variant, like `in-data-highlighted:bg-primary/20`, or
with `[data-highlighted] .title` in plain CSS. Cells work the same way with `group` and
`group-data-today:`.

**Highlighting is shared.** Hovering or focusing any piece of an event (each week of a multi-week
bar, each day of an overnight event) sets `data-highlighted` on every piece.

## State attributes

### Events

`EventBar` (also exported as `MonthEvent`), `TimeEvent`, `TimelineEvent`, and `GanttBar`.

| Attribute               | Set when                                                                              | On                           |
| ----------------------- | ------------------------------------------------------------------------------------- | ---------------------------- |
| `data-event-id`         | Always: the event's `id`.                                                             | all                          |
| `data-past`             | It ended before now (timed) or before today (all-day).                                | all                          |
| `data-highlighted`      | The pointer or focus is on any piece of the same event.                               | all                          |
| `data-editable`         | The calendar is `editable` and `can-edit` allows this event.                          | all                          |
| `data-dragging`         | It's being moved or resized, by pointer or keyboard.                                  | all                          |
| `data-all-day`          | It's an all-day event.                                                                | `EventBar`, `TimelineEvent`  |
| `data-continues-before` | This piece isn't the start: it began in an earlier week, or before the visible range. | `EventBar`, `GanttBar`       |
| `data-continues-after`  | This piece isn't the end.                                                             | `EventBar`, `GanttBar`       |
| `data-starts-before`    | It began before this day's (or row's) visible window.                                 | `TimeEvent`, `TimelineEvent` |
| `data-ends-after`       | It continues past the visible window.                                                 | `TimeEvent`, `TimelineEvent` |

`EventResizeHandle` renders only for editable events, with `data-edge="start"` or `"end"`.

### Days and cells

| Attribute       | Set when                                                                                         | On                                                            |
| --------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `data-date`     | Always: the ISO date, like `2026-10-14`.                                                         | `MonthDay`, `ResourceCell`, `TimeColumn`                      |
| `data-today`    | It's today.                                                                                      | `MonthDay`, `ResourceCell`, `ResourceDayHeader`, `TimeColumn` |
| `data-weekend`  | It's a Saturday or Sunday.                                                                       | the above, and `MonthWeekday`                                 |
| `data-outside`  | It belongs to the previous or next month.                                                        | `MonthDay`                                                    |
| `data-focused`  | It's the grid's focus position (the one cell with `tabindex=0`).                                 | `MonthDay`, `ResourceCell`                                    |
| `data-selected` | It's inside the range being selected.                                                            | `MonthDay`, `ResourceCell`                                    |
| `data-overflow` | Some of its events are hidden behind "+N more"; on a week, it needs more lanes than `max-lanes`. | `MonthDay`, `MonthWeek`                                       |
| `data-busy`     | It has at least one event.                                                                       | `ResourceCell`                                                |
| `data-overlap`  | It has overlapping events, like a double-booked technician.                                      | `ResourceCell`, and `ResourceRow` when any day does           |

### Rows and containers

| Attribute         | Set when                                              | On                           |
| ----------------- | ----------------------------------------------------- | ---------------------------- |
| `data-view`       | Always: `month`, `week`, or `day`.                    | `CalendarRoot`               |
| `data-action`     | Always: `prev`, `next`, or `today`.                   | `CalendarNav`                |
| `data-current`    | It's the `today` button and today is already in view. | `CalendarNav`                |
| `data-unassigned` | It's the row for events with no matching resource.    | `ResourceRow`, `TimelineRow` |
| `data-idle`       | It has no events in the visible range.                | `ResourceRow`, `TimelineRow` |
| `data-scale`      | Always: `day`, `week`, or `month`.                    | `Gantt`                      |

Attributes like `data-drop`, `data-resource-id`, `data-axis-start`, and `data-row-event-id` are how
drag and drop finds its targets. They're stable, but they're plumbing, not styling hooks.

## CSS custom properties

### Month and resources

| Property               | Meaning                                               | On             |
| ---------------------- | ----------------------------------------------------- | -------------- |
| `--event-column`       | The bar's first day, as a column from 0.              | `EventBar`     |
| `--event-span`         | How many days the bar covers in this week (or range). | `EventBar`     |
| `--event-lane`         | Its stacking lane, from 0.                            | `EventBar`     |
| `--week-lanes`         | Lanes the week draws, including the "+N more" lane.   | `MonthWeek`    |
| `--week-visible-lanes` | Lanes of bars, where "+N more" goes.                  | `MonthWeek`    |
| `--day-count`          | Days in the range, for sizing columns.                | `ResourceGrid` |
| `--row-lanes`          | Lanes the row needs (at least 1), for its height.     | `ResourceRow`  |

### Time grid

Minutes are counted from the top of the visible window (`slot-min-minutes`), so with the grid's
`--window-minutes`, `top: calc(var(--event-start) / var(--window-minutes) * 100%)` places an event.

| Property            | Meaning                                      | On              |
| ------------------- | -------------------------------------------- | --------------- |
| `--day-count`       | Columns shown: 7 for a week, 1 for a day.    | `TimeGrid`      |
| `--window-minutes`  | Minutes in each day's visible window.        | `TimeGrid`      |
| `--all-day-lanes`   | Lanes in the all-day row.                    | `TimeGrid`      |
| `--event-start`     | Where it starts, in minutes.                 | `TimeEvent`     |
| `--event-end`       | Where it ends, in minutes.                   | `TimeEvent`     |
| `--event-column`    | Its column among overlapping events, from 0. | `TimeEvent`     |
| `--event-columns`   | How many columns its overlap cluster shares. | `TimeEvent`     |
| `--now`             | The current time, in minutes.                | `NowIndicator`  |
| `--selection-start` | The selection's start, in minutes.           | `TimeSelection` |
| `--selection-end`   | The selection's end, in minutes.             | `TimeSelection` |

### Timeline

Minutes here are along the whole axis: each day contributes one window of `--window-minutes`.

| Property            | Meaning                                 | On                  |
| ------------------- | --------------------------------------- | ------------------- |
| `--axis-minutes`    | Length of the axis, in minutes.         | `Timeline`          |
| `--window-minutes`  | Minutes per day on the axis.            | `Timeline`          |
| `--slot-minutes`    | Minutes per header slot.                | `Timeline`          |
| `--slot-count`      | Header slots across the axis.           | `Timeline`          |
| `--row-lanes`       | Lanes the row needs (at least 1).       | `TimelineRow`       |
| `--event-start`     | Where it starts, in axis minutes.       | `TimelineEvent`     |
| `--event-end`       | Where it ends, in axis minutes.         | `TimelineEvent`     |
| `--event-lane`      | Its stacking lane, from 0.              | `TimelineEvent`     |
| `--now`             | The current time, in axis minutes.      | `TimelineNow`       |
| `--selection-start` | The selection's start, in axis minutes. | `TimelineSelection` |
| `--selection-end`   | The selection's end, in axis minutes.   | `TimelineSelection` |

### Gantt

| Property      | Meaning                                            | On           |
| ------------- | -------------------------------------------------- | ------------ |
| `--axis-days` | Days on the axis.                                  | `Gantt`      |
| `--bar-start` | Where the bar starts, in days from the axis start. | `GanttBar`   |
| `--bar-end`   | Where it ends, in days (exclusive).                | `GanttBar`   |
| `--today`     | Today, in days from the axis start.                | `GanttToday` |
