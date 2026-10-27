<script setup lang="ts">
import { computed } from 'vue';
import type { TimeGridDay } from '@calends/core';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { percent } from './percent.js';
import { injectCalendarContext } from './useCalendar.js';

/**
 * The range being dragged out in one day's hours. Renders only in that day's column; exposes
 * `--selection-offset` and `--selection-length` as percentages of the window, and
 * `--selection-start` and `--selection-end` in minutes from its top.
 */
const props = withDefaults(defineProps<PrimitiveProps & { day: TimeGridDay<any> }>(), {
    as: 'div',
});

const { selectedRange, timeGrid } = injectCalendarContext('TimeSelection');

const range = computed(() => {
    const selected = selectedRange.value;

    if (selected?.kind !== 'time' || !selected.startDate.equals(props.day.date)) return null;

    const offset = timeGrid.value.slotMinMinutes;

    return { start: selected.startMinutes! - offset, end: selected.endMinutes! - offset };
});
</script>

<template>
    <Primitive
        v-if="range"
        :as="as"
        :as-child="asChild"
        aria-hidden="true"
        :style="{
            '--selection-start': range.start,
            '--selection-end': range.end,
            '--selection-offset': percent(range.start, timeGrid.windowMinutes),
            '--selection-length': percent(range.end - range.start, timeGrid.windowMinutes),
        }"
    >
        <slot />
    </Primitive>
</template>
