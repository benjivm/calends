<script setup lang="ts">
import { computed } from 'vue';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { injectCalendarContext } from './useCalendar.js';

const props = withDefaults(defineProps<PrimitiveProps & { date: Temporal.PlainDate }>(), {
    as: 'div',
});

const { locale } = injectCalendarContext('MonthWeekday');

const label = computed(() => props.date.toLocaleString(locale.value, { weekday: 'short' }));
const longLabel = computed(() => props.date.toLocaleString(locale.value, { weekday: 'long' }));
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="columnheader"
        :aria-label="longLabel"
        :data-weekend="date.dayOfWeek >= 6 ? '' : undefined"
    >
        <slot
            :label="label"
            :long-label="longLabel"
            >{{ label }}</slot
        >
    </Primitive>
</template>
