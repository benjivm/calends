<script setup lang="ts">
import { computed } from 'vue';
import { wallMinutes, type TimeGridDay } from '@calends/core';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { injectCalendarContext } from './useCalendar.js';

/** Renders only in today's column and inside the visible window; exposes `--now` in minutes. */
const props = withDefaults(defineProps<PrimitiveProps & { day: TimeGridDay<any> }>(), {
    as: 'div',
});

const { now, timeZone, timeGrid } = injectCalendarContext('NowIndicator');

const minutes = computed(
    () => wallMinutes(now.value.withTimeZone(timeZone.value)) - timeGrid.value.slotMinMinutes,
);

const isVisible = computed(
    () => props.day.isToday && minutes.value >= 0 && minutes.value <= timeGrid.value.windowMinutes,
);
</script>

<template>
    <Primitive
        v-if="isVisible"
        :as="as"
        :as-child="asChild"
        aria-hidden="true"
        :style="{ '--now': minutes }"
    >
        <slot />
    </Primitive>
</template>
