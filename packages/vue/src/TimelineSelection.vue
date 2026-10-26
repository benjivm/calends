<script setup lang="ts">
import { computed } from 'vue';
import { daysBetween, type TimelineRow } from '@calends/core';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { injectCalendarContext } from './useCalendar.js';

/**
 * The range being dragged out along a row's hours. Renders only in that row; exposes
 * `--selection-start` and `--selection-end` in axis minutes.
 */
const props = withDefaults(defineProps<PrimitiveProps & { row: TimelineRow<any, any> }>(), {
    as: 'div',
});

const { selectedRange, timeline, resources } = injectCalendarContext('TimelineSelection');

const range = computed(() => {
    const selected = selectedRange.value;
    const rowResource = resources.value ? (props.row.resource?.id ?? null) : undefined;

    if (selected?.kind !== 'axis' || selected.resourceId !== rowResource) return null;

    const { start, windowMinutes, slotMinMinutes } = timeline.value;
    const toAxis = (date: Temporal.PlainDate, minutes: number) =>
        daysBetween(start, date) * windowMinutes + minutes - slotMinMinutes;

    return {
        start: toAxis(selected.startDate, selected.startMinutes!),
        end: toAxis(selected.endDate, selected.endMinutes!),
    };
});
</script>

<template>
    <Primitive
        v-if="range"
        :as="as"
        :as-child="asChild"
        aria-hidden="true"
        :style="{ '--selection-start': range.start, '--selection-end': range.end }"
    >
        <slot />
    </Primitive>
</template>
