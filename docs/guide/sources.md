<script setup>
import SourcesDemo from '../demos/SourcesDemo.vue';
</script>

# Multiple calendars

Calends draws one `events` array, so showing several calendars at once (a team's, a person's, and
the public holidays, say) is a matter of merging them before they go in. Toggling one off is a
filter, and coloring them is a field on each event.

<ClientOnly>
    <SourcesDemo />
</ClientOnly>

The legend is the **`CalendarSources` recipe**, in the `toolbar` slot of `MonthCalendar`. It works
the same in every view's toolbar.

```sh
npx shadcn-vue@latest add https://benjivm.github.io/calends/r/calendar-sources.json
```

::: details The recipe's source
<<< @/../recipes/calendar/CalendarSources.vue
:::

## Merging

Give each source an id and a color, and tag its events with both. Prefix the event ids too, since
two sources can each have an event `42`, and ids must be unique across the whole array:

```ts
import { computed, ref } from 'vue';

const calendars = [
    { id: 'work', label: 'Work', color: 'var(--chart-1)' },
    { id: 'personal', label: 'Personal', color: 'var(--chart-2)' },
    { id: 'holidays', label: 'Holidays', color: 'var(--chart-3)' },
];

const loaded = ref<Record<string, AppEvent[]>>({});
const hidden = ref<string[]>([]);

const events = computed(() =>
    calendars
        .filter((calendar) => !hidden.value.includes(calendar.id))
        .flatMap((calendar) =>
            (loaded.value[calendar.id] ?? []).map((event) => ({
                ...event,
                id: `${calendar.id}:${event.id}`,
                calendar: calendar.id,
                color: calendar.color,
            })),
        ),
);
```

```vue
<MonthCalendar :events="events">
    <template #toolbar>
        <CalendarSources v-model:hidden="hidden" :sources="calendars" />
    </template>
</MonthCalendar>
```

`CalendarSources` only tracks which ids are hidden, so a hidden calendar keeps its loaded events and
comes back instantly. Every recipe tints its default bar with an event's `color`, which can be any
CSS color. The `chart-1` to `chart-5` tokens are part of shadcn-vue's theme, so they follow your
palette and dark mode. Without the field, bars use `primary`.

For the primitives, put the color on the element yourself, like `:style="{ '--event-color':
event.source.color }"`, and style with it.

## Loading by range

To fetch only what's in view, watch the period and load each calendar for it. The month grid pads
its weeks with days from the months either side, so pad the range by a week:

```ts
import { watch } from 'vue';
import { periodRange } from '@calends/core';

const loading = ref(false);

watch(
    date,
    async (value) => {
        const { start, end } = periodRange(value, 'month');
        const from = start.subtract({ days: 6 });
        const to = end.add({ days: 6 });

        loading.value = true;
        const results = await Promise.all(
            calendars.map((calendar) => fetchEvents(calendar.id, from, to)),
        );
        loaded.value = Object.fromEntries(
            calendars.map((calendar, index) => [calendar.id, results[index]]),
        );
        loading.value = false;
    },
    { immediate: true },
);
```

Pass `loading` to the recipe to show placeholder bars while that runs. A source that loads slowly
can fill in on its own instead: set its entry in `loaded` as soon as it arrives.

## Committing changes

An event that's dragged comes back with its `calendar` and prefixed `id`, so the drop handler knows
where to send it:

```ts
import type { EventDropDetail } from '@calends/vue';

function moveEvent({ event, start, end }: EventDropDetail<(typeof events.value)[number]>) {
    const id = event.id.slice(event.calendar.length + 1);

    loaded.value[event.calendar] = loaded.value[event.calendar].map((item) =>
        item.id === id ? { ...item, start, end } : item,
    );
    saveEvent(event.calendar, id, { start, end });
}
```

To keep a read-only calendar (like holidays) from being dragged, pass
`:can-edit="(event) => event.calendar !== 'holidays'"`.
