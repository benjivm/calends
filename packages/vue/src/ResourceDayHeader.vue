<script setup lang="ts">
import { computed } from 'vue';
import type { ResourceDay } from '@calends/core';
import { Primitive, type PrimitiveProps } from './Primitive.js';
import { injectCalendarContext } from './useCalendar.js';

const props = withDefaults(defineProps<PrimitiveProps & { day: ResourceDay }>(), { as: 'div' });

const { locale } = injectCalendarContext('ResourceDayHeader');

const weekday = computed(() => props.day.date.toLocaleString(locale.value, { weekday: 'short' }));
const label = computed(() => props.day.date.toLocaleString(locale.value, { dateStyle: 'full' }));
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="columnheader"
        :aria-label="label"
        :data-today="day.isToday ? '' : undefined"
        :data-weekend="day.isWeekend ? '' : undefined"
    >
        <slot
            :day="day"
            :weekday="weekday"
            >{{ weekday }} {{ day.date.day }}</slot
        >
    </Primitive>
</template>
