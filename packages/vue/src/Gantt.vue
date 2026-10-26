<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { injectCalendarContext } from './useCalendar.js';

/** Exposes `--axis-days` so the recipe can size the track and place bars, columns, and today. */
withDefaults(defineProps<PrimitiveProps>(), { as: 'div' });

const calendar = injectCalendarContext('Gantt');
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="group"
        :data-scale="calendar.gantt.value.scale"
        :style="{ '--axis-days': calendar.gantt.value.axisDays }"
        @pointerdown="calendar.startSelection"
    >
        <slot
            :gantt="calendar.gantt.value"
            :rows="calendar.gantt.value.rows"
            :columns="calendar.gantt.value.columns"
            :groups="calendar.gantt.value.groups"
        />
    </Primitive>
</template>
