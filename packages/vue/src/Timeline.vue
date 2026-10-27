<script setup lang="ts">
import { Primitive, type PrimitiveProps } from './Primitive.js';
import { injectCalendarContext } from './useCalendar.js';

/**
 * Exposes `--axis-minutes`, `--window-minutes`, `--slot-minutes`, and `--slot-count` so the
 * recipe can size the track and turn an event's axis minutes into `left` and `width`.
 */
withDefaults(defineProps<PrimitiveProps>(), { as: 'div' });

const calendar = injectCalendarContext('Timeline');
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="group"
        :aria-label="calendar.title.value"
        :style="{
            '--axis-minutes': calendar.timeline.value.axisMinutes,
            '--window-minutes': calendar.timeline.value.windowMinutes,
            '--slot-minutes': calendar.timeline.value.slotMinutes,
            '--slot-count':
                calendar.timeline.value.axisMinutes / calendar.timeline.value.slotMinutes,
        }"
        @pointerdown="calendar.startSelection"
    >
        <slot
            :timeline="calendar.timeline.value"
            :days="calendar.timeline.value.days"
            :rows="calendar.timeline.value.rows"
        />
    </Primitive>
</template>
