<script setup lang="ts">
import { computed } from 'vue';
import type { TimeGridDay } from '@calends/core';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { injectCalendarContext } from './useCalendar.js';

const props = withDefaults(defineProps<PrimitiveProps & { day: TimeGridDay<any> }>(), {
    as: 'div',
});

const { locale } = injectCalendarContext('TimeColumn');

const label = computed(() => props.day.date.toLocaleString(locale.value, { dateStyle: 'full' }));
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="group"
        :aria-label="label"
        :data-date="day.date.toString()"
        :data-today="day.isToday ? '' : undefined"
        :data-weekend="day.isWeekend ? '' : undefined"
        data-drop="time"
    >
        <slot
            :day="day"
            :events="day.events"
        />
    </Primitive>
</template>
