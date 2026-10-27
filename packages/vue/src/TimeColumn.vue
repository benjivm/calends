<script setup lang="ts">
import { computed } from 'vue';
import type { TimeGridDay } from '@calends/core';
import { Primitive, type PrimitiveProps } from './Primitive.js';
import { injectCalendarContext } from './useCalendar.js';

const props = withDefaults(defineProps<PrimitiveProps & { day: TimeGridDay<any> }>(), {
    as: 'div',
});

const calendar = injectCalendarContext('TimeColumn');

const isFocused = computed(() => props.day.date.equals(calendar.focusedDate.value));

const label = computed(() => {
    const date = props.day.date.toLocaleString(calendar.locale.value, { dateStyle: 'full' });
    const count = props.day.events.length;

    return count ? `${date}, ${count} ${count === 1 ? 'event' : 'events'}` : date;
});
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="group"
        :tabindex="isFocused ? 0 : -1"
        :aria-label="label"
        :aria-current="day.isToday ? 'date' : undefined"
        :data-date="day.date.toString()"
        :data-today="day.isToday ? '' : undefined"
        :data-weekend="day.isWeekend ? '' : undefined"
        :data-focused="isFocused ? '' : undefined"
        data-drop="time"
        @focus="calendar.focusedDate.value = day.date"
    >
        <slot
            :day="day"
            :events="day.events"
        />
    </Primitive>
</template>
