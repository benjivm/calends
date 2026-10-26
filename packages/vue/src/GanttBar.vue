<script setup lang="ts">
import type { GanttRow } from '@calends/core';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { useEventState } from './useEventState.js';

/** Exposes its placement as `--bar-start` and `--bar-end`, in days from the start of the axis. */
const props = withDefaults(defineProps<PrimitiveProps & { row: GanttRow<any> }>(), { as: 'div' });

const {
    isHighlighted,
    isPast,
    isEditable,
    isDragging,
    highlight,
    unhighlight,
    onPointerdown,
    onKeydown,
} = useEventState('GanttBar', () => props.row.event, {
    axes: { horizontal: 'day', vertical: 'none' },
});
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        :style="{ '--bar-start': row.startOffset, '--bar-end': row.endOffset }"
        :data-event-id="row.event.id"
        :data-continues-before="row.continuesBefore ? '' : undefined"
        :data-continues-after="row.continuesAfter ? '' : undefined"
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
            :event="row.event"
            :row="row"
        />
    </Primitive>
</template>
