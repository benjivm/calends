<script setup lang="ts">
import { computed } from 'vue';
import type { ResourceId, TimelineItem } from '@calends/core';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { injectCalendarContext } from './useCalendar.js';
import { useEventState } from './useEventState.js';

/** Exposes its placement as `--event-start`, `--event-end` (axis minutes), and `--event-lane`. */
const props = withDefaults(
    defineProps<
        PrimitiveProps & {
            item: TimelineItem<any>;
            /** The row it's drawn in, so moving it can change resource. */
            resourceId?: ResourceId | null;
        }
    >(),
    { as: 'div', resourceId: undefined },
);

const calendar = injectCalendarContext('TimelineEvent');

/** Left and right move along the hours; up and down move between resource rows. */
const axes = computed(() => ({
    horizontal: 'minutes' as const,
    vertical: 'resource' as const,
    resourceOrder: calendar.timeline.value.rows.map((row) => row.resource?.id ?? null),
}));

const {
    isHighlighted,
    isPast,
    isEditable,
    isDragging,
    highlight,
    unhighlight,
    onPointerdown,
    onKeydown,
} = useEventState('TimelineEvent', () => props.item.event, {
    axes,
    resourceId: () => props.resourceId,
});
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        :style="{
            '--event-start': item.startOffset,
            '--event-end': item.endOffset,
            '--event-lane': item.lane,
        }"
        :data-event-id="item.event.id"
        :data-all-day="item.event.allDay ? '' : undefined"
        :data-starts-before="item.startsBefore ? '' : undefined"
        :data-ends-after="item.endsAfter ? '' : undefined"
        :data-past="isPast ? '' : undefined"
        :data-highlighted="isHighlighted ? '' : undefined"
        :data-editable="isEditable ? '' : undefined"
        :data-dragging="isDragging ? '' : undefined"
        @pointerenter="highlight"
        @pointerleave="unhighlight"
        @focusin="highlight"
        @focusout="unhighlight"
        @pointerdown="onPointerdown"
        @keydown="onKeydown"
    >
        <slot
            :event="item.event"
            :item="item"
        />
    </Primitive>
</template>
