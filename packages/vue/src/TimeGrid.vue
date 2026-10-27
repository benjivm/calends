<script setup lang="ts">
import { nextTick } from 'vue';
import { navigate } from '@calends/core';
import { focusTarget } from './focus.js';
import { Primitive, type PrimitiveProps } from './Primitive.js';
import { injectCalendarContext } from './useCalendar.js';

/**
 * Exposes `--day-count` and `--window-minutes` so the recipe can size columns and turn an
 * event's minutes into a position. Day columns take roving focus; arrows step into their events.
 */
withDefaults(defineProps<PrimitiveProps>(), { as: 'div' });

const calendar = injectCalendarContext('TimeGrid');

const COLUMN = '[data-drop="time"]';

function dayTarget(event: KeyboardEvent, from: Temporal.PlainDate): Temporal.PlainDate | null {
    switch (event.key) {
        case 'ArrowLeft':
            return from.subtract({ days: 1 });
        case 'ArrowRight':
            return from.add({ days: 1 });
        case 'Home':
            return calendar.range.value.start;
        case 'End':
            return calendar.range.value.end;
        case 'PageUp':
            return navigate(from, calendar.view.value, -1);
        case 'PageDown':
            return navigate(from, calendar.view.value, 1);
        default:
            return null;
    }
}

async function focusDay(grid: HTMLElement, date: Temporal.PlainDate) {
    calendar.focusDate(date);

    await nextTick();
    grid.querySelector<HTMLElement>(`${COLUMN}[data-date="${date.toString()}"]`)?.focus();
}

/**
 * From a day column: Left and Right change day, Home and End go to the period's ends, PageUp and
 * PageDown page it, and Down or Up enter its first or last event. From an event's own focus
 * target: Up and Down step through the column's events (Up from the first returns to the column),
 * and Left and Right go to the next day. Anything else inside an event, like an input, keeps its keys.
 */
async function onKeydown(event: KeyboardEvent) {
    const grid = event.currentTarget as HTMLElement;
    const target = event.target instanceof HTMLElement ? event.target : null;
    const column = target?.closest<HTMLElement>(COLUMN);

    if (!target || !column || event.altKey || event.metaKey || event.ctrlKey) return;

    const events = [...column.querySelectorAll<HTMLElement>('[data-event-id]')];

    if (target === column) {
        const entry =
            event.key === 'ArrowDown' ? events[0] : event.key === 'ArrowUp' ? events.at(-1) : null;

        if (entry) {
            event.preventDefault();
            focusTarget(entry)?.focus();

            return;
        }

        const date = dayTarget(event, calendar.focusedDate.value);

        if (date) {
            event.preventDefault();
            await focusDay(grid, date);
        }

        return;
    }

    const current = events.find((element) => element.contains(target));

    if (!current || focusTarget(current) !== target) return;

    const index = events.indexOf(current);

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            focusTarget(events[index + 1])?.focus();
            break;
        case 'ArrowUp':
            event.preventDefault();
            (index ? focusTarget(events[index - 1]) : column)?.focus();
            break;
        case 'ArrowLeft':
        case 'ArrowRight': {
            event.preventDefault();

            const day = Temporal.PlainDate.from(column.dataset.date!);

            await focusDay(grid, day.add({ days: event.key === 'ArrowLeft' ? -1 : 1 }));
            break;
        }
    }
}
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="group"
        :aria-label="calendar.title.value"
        :style="{
            '--day-count': calendar.timeGrid.value.days.length,
            '--window-minutes': calendar.timeGrid.value.windowMinutes,
            '--all-day-lanes': calendar.timeGrid.value.allDay.laneCount,
        }"
        @keydown="onKeydown"
        @pointerdown="calendar.startSelection"
    >
        <slot
            :grid="calendar.timeGrid.value"
            :days="calendar.timeGrid.value.days"
            :all-day="calendar.timeGrid.value.allDay"
            :hours="calendar.timeGrid.value.hours"
        />
    </Primitive>
</template>
