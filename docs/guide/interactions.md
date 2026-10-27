# Interactions

Every view can move, resize, and select by pointer, touch, and keyboard. All of it is off until you
turn it on, and none of it changes your data: the calendar reports what the person did, and your
app decides whether to apply it.

```html
<CalendarRoot
    :events="events"
    editable
    selectable
    :snap-minutes="15"
    :can-edit="(event) => !event.locked"
    @event-drop="moveEvent"
    @event-resize="moveEvent"
    @range-select="createEvent"
></CalendarRoot>
```

| Prop           | Default    | What it does                                                                           |
| -------------- | ---------- | -------------------------------------------------------------------------------------- |
| `editable`     | `false`    | Events can be dragged to move them, and resized by their handles.                      |
| `selectable`   | `false`    | Dragging across empty days or hours selects a range.                                   |
| `snap-minutes` | `15`       | What timed moves, resizes, and selections snap to, and a timed event's minimum length. |
| `can-edit`     | all events | Limits editing to the events it returns true for, like ones the person owns.           |

Events that can be edited get `data-editable`, and the one being moved gets `data-dragging` (see
[Styling](/guide/styling#events)).

## Committing a change

`event-drop` and `event-resize` both carry an `EventDropDetail`:

| Field                | Type                                 | Notes                                                                                |
| -------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| `event`              | your event object                    | The object you passed in, untouched.                                                 |
| `start`, `end`       | `PlainDate` or `ZonedDateTime`       | The new times. Inclusive last day for all-day events, exclusive end for timed ones.  |
| `previousStart/End`  | the same                             | Where it was, for undo or for reverting a failed save.                               |
| `allDay`             | `boolean`                            | `PlainDate` times when true, `ZonedDateTime` in the calendar's time zone when false. |
| `resourceId`         | `string \| number \| null`, optional | Only when it moved to another resource row (`null` for the unassigned row).          |
| `previousResourceId` | the same                             | The row it left.                                                                     |

Neither fires when nothing changed, like a drop back where it started. A timed event moved to
another day keeps its time of day, and moves are by wall-clock time, so a 9:00 meeting dragged
across a daylight saving change still starts at 9:00.

The times are valid event input as they are, so applying a change is a replace by `id`. To update
optimistically and roll back if the save fails:

```ts
import type { EventDropDetail } from '@calends/vue';

async function moveEvent({ event, start, end }: EventDropDetail<AppEvent>) {
    const before = events.value;

    events.value = events.value.map((item) =>
        item.id === event.id ? { ...item, start: start.toString(), end: end.toString() } : item,
    );

    try {
        await saveEvent(event.id, { start: start.toString(), end: end.toString() });
    } catch {
        events.value = before;
    }
}
```

`toString()` gives `2026-10-14` for a day and `2026-10-14T09:00:00-05:00[America/Chicago]` for a
zoned time. If your API wants an instant, send `start.toInstant().toString()` for timed events.

### Resizing

Put `EventResizeHandle` inside an event primitive, with `edge="start"` or `"end"`. It renders only
when the event is editable, and dragging it emits `event-resize`. An all-day event can't shrink
below one day, and a timed one below `snap-minutes`.

### Moving between rows

In the resource and timeline views, a drop in another row adds `resourceId` and
`previousResourceId`. The calendar only moves the event out of the row it was dragged from, so an
event that belongs to several resources keeps the others: swap `previousResourceId` for
`resourceId` in its list rather than replacing the list.

## Selecting a range

`range-select` fires when a selection drag ends, with a `RangeSelectDetail`:

| Field        | Type                                 | Notes                                                                              |
| ------------ | ------------------------------------ | ---------------------------------------------------------------------------------- |
| `start`      | `PlainDate` or `ZonedDateTime`       |                                                                                    |
| `end`        | the same                             | Inclusive last day for all-day ranges, exclusive end time for timed ones.          |
| `allDay`     | `boolean`                            | Days in the month, resource, and Gantt views and the all-day row; times elsewhere. |
| `resourceId` | `string \| number \| null`, optional | The row it was made in, in the resource and timeline views.                        |

A time grid selection stays within the day it starts in. A timeline selection can cross days in the
week view. A press on an event, a resize handle, "+N more", a link, a button, or a form field
doesn't start a selection. To exempt your own controls, give them `data-calendar-control`.

While it's dragged, `MonthDay` and `ResourceCell` get `data-selected`, and `TimeSelection` and
`TimelineSelection` render the range in the time grid and timeline. The Gantt view reports
selections but draws nothing for them.

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

## Pointer and touch

- **Mouse and pen** drags start once the pointer moves 4px, so a click on an event still reaches
  your click handler. The click that ends a real drag is swallowed.
- **Touch** starts with a long press (half a second), so a swipe across the calendar still scrolls
  the page. A finger that moves before then scrolls as usual. Once the press is held, the page
  doesn't scroll and the context menu stays shut. See [Styling](/guide/styling#patterns) for sizing
  handles for a finger and stopping the iOS callout.
- **Escape** or a cancelled pointer (an incoming call, say) puts the event back and emits nothing.
- **Edges scroll.** Bringing the pointer near the edge of a scroll container (the time grid's hours,
  a wide timeline, or the page itself) scrolls it while dragging or selecting.

The preview is the real layout: the dragged event is swapped to its new times before the view lays
out, so it packs into lanes and columns as it would after the drop. Your slot content renders for
it as usual.

## Keyboard

With `editable`, Space on a focused event picks it up, the arrow keys move it, Shift with
the arrows moves its end instead, Space or Enter drops it, and Escape puts it back. What the arrows
do depends on the view:

| View      | Left / Right   | Up / Down                |
| --------- | -------------- | ------------------------ |
| Month     | A day          | A week                   |
| Time grid | A day          | `snap-minutes`           |
| Resources | A day          | The previous or next row |
| Timeline  | `snap-minutes` | The previous or next row |
| Gantt     | A day          | Nothing                  |

Each step is announced through `CalendarRoot`'s live region, with the new date and time, and the
drop emits the same events a pointer drop does. Navigating between days and events without moving
anything is covered on each view's page.

`EventBar` defaults to the month's axes, so it takes `keyboard-axes` wherever it's used outside the
month grid. In the time grid's all-day row, Up and Down should do nothing:

```vue
<EventBar :segment="segment" :keyboard-axes="{ horizontal: 'day', vertical: 'none' }" />
```

In the resource view, they move between rows, so the bar needs its row and the order of every row:

```vue
<EventBar
    :segment="segment"
    :resource-id="row.resource?.id ?? null"
    :keyboard-axes="{
        horizontal: 'day',
        vertical: 'resource',
        resourceOrder: rows.map((row) => row.resource?.id ?? null),
    }"
/>
```

`TimeEvent`, `TimelineEvent`, and `GanttBar` set their own.

## Drop targets in your own markup

Drags find what's under the pointer from data attributes the primitives render. Markup of your own
can be a target too. The time grid recipe's all-day row is plain cells, each marked as a day:

```html
<div
    v-for="day in days"
    data-drop="day"
    :data-date="day.date.toString()"
></div>
```

Add `data-resource-id` (empty for the unassigned row) to make a cell belong to a resource row.
Selections only start inside a grid primitive (`MonthGrid`, `TimeGrid`, `ResourceGrid`,
`Timeline`, or `Gantt`), so a custom target there can be selected across as well as dropped on.
