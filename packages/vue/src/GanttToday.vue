<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { percent } from './percent.js';
import { injectCalendarContext } from './useCalendar.js';

/**
 * Renders only when today is on the axis; exposes `--today-offset` and `--today-length` (one
 * day) as percentages of the axis, and `--today` in days from its start.
 */
withDefaults(defineProps<PrimitiveProps>(), { as: 'div' });

const { gantt } = injectCalendarContext('GanttToday');
</script>

<template>
    <Primitive
        v-if="gantt.todayOffset !== null"
        :as="as"
        :as-child="asChild"
        aria-hidden="true"
        :style="{
            '--today': gantt.todayOffset,
            '--today-offset': percent(gantt.todayOffset, gantt.axisDays),
            '--today-length': percent(1, gantt.axisDays),
        }"
    >
        <slot />
    </Primitive>
</template>
