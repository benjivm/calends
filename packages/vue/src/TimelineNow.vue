<script setup lang="ts">
import { computed } from 'vue';
import { wallMinutes } from '@calends/core';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { percent } from './percent.js';
import { injectCalendarContext } from './useCalendar.js';

/**
 * Renders only while now falls inside a visible day's window; exposes `--now-offset` as a
 * percentage of the axis, and `--now` in axis minutes.
 */
withDefaults(defineProps<PrimitiveProps>(), { as: 'div' });

const { now, timeZone, timeline } = injectCalendarContext('TimelineNow');

const offset = computed(() => {
    const local = now.value.withTimeZone(timeZone.value);
    const day = timeline.value.days.find((candidate) => candidate.date.equals(local.toPlainDate()));
    const minutes = wallMinutes(local) - timeline.value.slotMinMinutes;

    if (!day || minutes < 0 || minutes > timeline.value.windowMinutes) {
        return null;
    }

    return day.offset + minutes;
});
</script>

<template>
    <Primitive
        v-if="offset !== null"
        :as="as"
        :as-child="asChild"
        aria-hidden="true"
        :style="{ '--now': offset, '--now-offset': percent(offset, timeline.axisMinutes) }"
    >
        <slot />
    </Primitive>
</template>
