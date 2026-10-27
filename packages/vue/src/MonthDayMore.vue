<script setup lang="ts">
import { computed } from 'vue';
import type { MonthDay } from '@calends/core';
import { Primitive, type PrimitiveProps } from './Primitive.js';
import { injectCalendarContext } from './useCalendar.js';

/** Renders nothing on days where every event fits, so the recipe can place it unconditionally. */
const props = withDefaults(defineProps<PrimitiveProps & { day: MonthDay<any> }>(), {
    as: 'button',
});

const { locale } = injectCalendarContext('MonthDayMore');

const label = computed(() => {
    const date = props.day.date.toLocaleString(locale.value, { month: 'long', day: 'numeric' });

    return `Show all ${props.day.eventCount} events on ${date}`;
});
</script>

<template>
    <Primitive
        v-if="day.hiddenCount"
        :as="as"
        :as-child="asChild"
        :type="as === 'button' ? 'button' : undefined"
        :aria-label="label"
        data-calendar-control
    >
        <slot
            :hidden-count="day.hiddenCount"
            :event-count="day.eventCount"
            >+{{ day.hiddenCount }} more</slot
        >
    </Primitive>
</template>
