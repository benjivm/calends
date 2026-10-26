<script setup lang="ts">
import type { EventSegment, ResourceId } from '@calends/core';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { useEventState } from './useEventState.js';
import type { KeyboardAxes } from './useInteractions.js';

/**
 * Exposes its placement as CSS variables (column, span, and lane) rather than inline
 * geometry, so the recipe decides how bars are drawn.
 */
const props = withDefaults(
    defineProps<
        PrimitiveProps & {
            segment: EventSegment<any>;
            /** How arrow keys move it once picked up; a month grid moves by days and weeks. */
            keyboardAxes?: KeyboardAxes;
            /** The resource row it's drawn in, so moving it can change resource. */
            resourceId?: ResourceId | null;
        }
    >(),
    {
        as: 'div',
        keyboardAxes: () => ({ horizontal: 'day', vertical: 'week' }),
        resourceId: undefined,
    },
);

const {
    isHighlighted,
    isPast,
    isEditable,
    isDragging,
    highlight,
    unhighlight,
    onPointerdown,
    onKeydown,
} = useEventState('EventBar', () => props.segment.event, {
    axes: () => props.keyboardAxes,
    resourceId: () => props.resourceId,
});
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        :style="{
            '--event-column': segment.column,
            '--event-span': segment.span,
            '--event-lane': segment.lane,
        }"
        :data-event-id="segment.event.id"
        :data-all-day="segment.event.allDay ? '' : undefined"
        :data-continues-before="segment.continuesBefore ? '' : undefined"
        :data-continues-after="segment.continuesAfter ? '' : undefined"
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
            :event="segment.event"
            :segment="segment"
        />
    </Primitive>
</template>
