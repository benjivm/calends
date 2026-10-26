<script setup lang="ts">
import { computed } from 'vue';
import type { MonthDay } from '@calends/core';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { injectCalendarContext } from './useCalendar.js';

const props = withDefaults(defineProps<PrimitiveProps & { day: MonthDay<any> }>(), {
    as: 'div',
});

const calendar = injectCalendarContext('MonthDay');

const isSelected = computed(() => {
    const range = calendar.selectedRange.value;

    return (
        range?.kind === 'day' &&
        Temporal.PlainDate.compare(props.day.date, range.startDate) >= 0 &&
        Temporal.PlainDate.compare(props.day.date, range.endDate) <= 0
    );
});

const isFocused = computed(() => props.day.date.equals(calendar.focusedDate.value));

const label = computed(() => {
    const date = props.day.date.toLocaleString(calendar.locale.value, { dateStyle: 'full' });
    const count = props.day.eventCount;

    return count ? `${date}, ${count} ${count === 1 ? 'event' : 'events'}` : date;
});
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="gridcell"
        :tabindex="isFocused ? 0 : -1"
        :aria-label="label"
        :aria-current="day.isToday ? 'date' : undefined"
        :data-date="day.date.toString()"
        :data-today="day.isToday ? '' : undefined"
        :data-outside="day.isOutside ? '' : undefined"
        :data-weekend="day.isWeekend ? '' : undefined"
        :data-focused="isFocused ? '' : undefined"
        :data-overflow="day.hiddenCount ? '' : undefined"
        :data-selected="isSelected ? '' : undefined"
        data-drop="day"
        @focus="calendar.focusedDate.value = day.date"
    >
        <slot
            :day="day"
            :segments="day.segments"
            :covering-segments="day.coveringSegments"
            :hidden-count="day.hiddenCount"
        />
    </Primitive>
</template>
