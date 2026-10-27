<script setup lang="ts">
import { Primitive, type PrimitiveProps } from './Primitive.js';
import { injectCalendarContext } from './useCalendar.js';

/** A row's day axis: drops and selections are measured against its width. */
withDefaults(defineProps<PrimitiveProps>(), { as: 'div' });

const { gantt } = injectCalendarContext('GanttTrack');
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        data-drop="dayaxis"
        :data-axis-start="gantt.start.toString()"
        :data-axis-days="gantt.axisDays"
    >
        <slot />
    </Primitive>
</template>
