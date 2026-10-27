<script setup lang="ts">
import { nextTick } from 'vue';
import { startOfWeek } from '@calends/core';
import { Primitive, type PrimitiveProps } from './Primitive.js';
import { injectCalendarContext } from './useCalendar.js';

withDefaults(defineProps<PrimitiveProps>(), { as: 'div' });

const calendar = injectCalendarContext('MonthGrid');

function targetFor(event: KeyboardEvent, from: Temporal.PlainDate): Temporal.PlainDate | null {
    const weekStartsOn = calendar.grid.value.weekdays[0].dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7;

    switch (event.key) {
        case 'ArrowLeft':
            return from.subtract({ days: 1 });
        case 'ArrowRight':
            return from.add({ days: 1 });
        case 'ArrowUp':
            return from.subtract({ weeks: 1 });
        case 'ArrowDown':
            return from.add({ weeks: 1 });
        case 'Home':
            return startOfWeek(from, weekStartsOn);
        case 'End':
            return startOfWeek(from, weekStartsOn).add({ days: 6 });
        case 'PageUp':
            return from.subtract(event.shiftKey ? { years: 1 } : { months: 1 });
        case 'PageDown':
            return from.add(event.shiftKey ? { years: 1 } : { months: 1 });
        default:
            return null;
    }
}

/** Keys only steer focus from a day cell, so arrows inside an event link or an input still work. */
async function onKeydown(event: KeyboardEvent) {
    const grid = event.currentTarget as HTMLElement;
    const cell = event.target instanceof HTMLElement ? event.target : null;

    if (cell?.getAttribute('role') !== 'gridcell') {
        return;
    }

    const target = targetFor(event, calendar.focusedDate.value);

    if (!target) {
        return;
    }

    event.preventDefault();
    calendar.focusDate(target);

    await nextTick();
    grid.querySelector<HTMLElement>(`[data-date="${target.toString()}"]`)?.focus();
}
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="grid"
        :aria-label="calendar.title.value"
        @keydown="onKeydown"
        @pointerdown="calendar.startSelection"
    >
        <slot
            :grid="calendar.grid.value"
            :weekdays="calendar.grid.value.weekdays"
            :weeks="calendar.grid.value.weeks"
        />
    </Primitive>
</template>
