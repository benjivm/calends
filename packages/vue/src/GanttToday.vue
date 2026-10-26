<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { injectCalendarContext } from './useCalendar.js';

/** Renders only when today is on the axis; exposes `--today` in days from its start. */
withDefaults(defineProps<PrimitiveProps>(), { as: 'div' });

const { gantt } = injectCalendarContext('GanttToday');
</script>

<template>
    <Primitive
        v-if="gantt.todayOffset !== null"
        :as="as"
        :as-child="asChild"
        aria-hidden="true"
        :style="{ '--today': gantt.todayOffset }"
    >
        <slot />
    </Primitive>
</template>
