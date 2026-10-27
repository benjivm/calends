<script setup lang="ts">
import { computed } from 'vue';
import { isSamePeriod } from '@calends/core';
import { Primitive, type PrimitiveProps } from './Primitive.js';
import { injectCalendarContext } from './useCalendar.js';

const props = withDefaults(defineProps<PrimitiveProps & { action: 'prev' | 'next' | 'today' }>(), {
    as: 'button',
});

const calendar = injectCalendarContext('CalendarNav');

const showsToday = computed(
    () =>
        props.action === 'today' &&
        isSamePeriod(
            calendar.date.value,
            calendar.today.value,
            calendar.view.value,
            calendar.weekStartsOn.value,
        ),
);

function run() {
    if (props.action === 'prev') {
        calendar.prev();
    } else if (props.action === 'next') {
        calendar.next();
    } else {
        calendar.goToToday();
    }
}
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        :type="as === 'button' ? 'button' : undefined"
        :data-action="action"
        :data-current="showsToday ? '' : undefined"
        @click="run"
    >
        <slot />
    </Primitive>
</template>
