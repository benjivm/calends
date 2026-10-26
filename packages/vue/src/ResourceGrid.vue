<script setup lang="ts">
import { nextTick } from 'vue';
import { navigate } from '@calends/core';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { injectCalendarContext } from './useCalendar.js';

/** Exposes the day count as `--day-count` so the recipe can size its columns. */
withDefaults(defineProps<PrimitiveProps>(), { as: 'div' });

const calendar = injectCalendarContext('ResourceGrid');

function targetFor(
    event: KeyboardEvent,
    date: Temporal.PlainDate,
    row: number,
): { date: Temporal.PlainDate; row: number } | null {
    const lastRow = calendar.resourceGrid.value.rows.length - 1;
    const { start, end } = calendar.range.value;

    switch (event.key) {
        case 'ArrowLeft':
            return { date: date.subtract({ days: 1 }), row };
        case 'ArrowRight':
            return { date: date.add({ days: 1 }), row };
        case 'ArrowUp':
            return { date, row: Math.max(row - 1, 0) };
        case 'ArrowDown':
            return { date, row: Math.min(row + 1, lastRow) };
        case 'Home':
            return { date: event.ctrlKey ? date : start, row: event.ctrlKey ? 0 : row };
        case 'End':
            return { date: event.ctrlKey ? date : end, row: event.ctrlKey ? lastRow : row };
        case 'PageUp':
            return { date: navigate(date, calendar.view.value, -1), row };
        case 'PageDown':
            return { date: navigate(date, calendar.view.value, 1), row };
        default:
            return null;
    }
}

/** Keys only steer focus from a cell, so arrows inside an event link still work. */
async function onKeydown(event: KeyboardEvent) {
    const grid = event.currentTarget as HTMLElement;
    const cell = event.target instanceof HTMLElement ? event.target : null;

    if (cell?.getAttribute('role') !== 'gridcell') {
        return;
    }

    const target = targetFor(event, calendar.focusedDate.value, calendar.focusedRow.value);

    if (!target) {
        return;
    }

    event.preventDefault();
    calendar.focusedRow.value = target.row;
    calendar.focusDate(target.date);

    await nextTick();
    grid.querySelector<HTMLElement>(
        `[data-row="${target.row}"][data-date="${target.date.toString()}"]`,
    )?.focus();
}
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="grid"
        :aria-label="calendar.title.value"
        :style="{ '--day-count': calendar.resourceGrid.value.days.length }"
        @keydown="onKeydown"
        @pointerdown="calendar.startSelection"
    >
        <slot
            :grid="calendar.resourceGrid.value"
            :days="calendar.resourceGrid.value.days"
            :rows="calendar.resourceGrid.value.rows"
        />
    </Primitive>
</template>
