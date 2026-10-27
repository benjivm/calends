<script setup lang="ts">
import type { TimedEventLayout } from '@calends/core';
import { Primitive, type PrimitiveProps } from './Primitive.js';
import { percent } from './percent.js';
import { injectCalendarContext } from './useCalendar.js';
import { useEventState } from './useEventState.js';

/**
 * Exposes its placement as CSS variables: `--event-offset` and `--event-length` as percentages
 * of the window for `top` and `height`, the same in minutes, and its column.
 */
const props = withDefaults(defineProps<PrimitiveProps & { layout: TimedEventLayout<any> }>(), {
    as: 'div',
});

const { timeGrid } = injectCalendarContext('TimeEvent');

const {
    isHighlighted,
    isPast,
    isEditable,
    isDragging,
    highlight,
    unhighlight,
    onPointerdown,
    onKeydown,
} = useEventState('TimeEvent', () => props.layout.event, {
    axes: { horizontal: 'day', vertical: 'minutes' },
});
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        :style="{
            '--event-start': layout.startMinutes,
            '--event-end': layout.endMinutes,
            '--event-offset': percent(layout.startMinutes, timeGrid.windowMinutes),
            '--event-length': percent(
                layout.endMinutes - layout.startMinutes,
                timeGrid.windowMinutes,
            ),
            '--event-column': layout.column,
            '--event-columns': layout.columnCount,
        }"
        :data-event-id="layout.event.id"
        :data-starts-before="layout.startsBefore ? '' : undefined"
        :data-ends-after="layout.endsAfter ? '' : undefined"
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
            :event="layout.event"
            :layout="layout"
        />
    </Primitive>
</template>
