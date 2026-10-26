<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { injectCalendarContext } from './useCalendar.js';

/**
 * Exposes `--day-count` and `--window-minutes` so the recipe can size columns and turn an
 * event's minutes into a position. Events inside are links, reached with Tab.
 */
withDefaults(defineProps<PrimitiveProps>(), { as: 'div' });

const calendar = injectCalendarContext('TimeGrid');
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
