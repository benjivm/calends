<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { injectCalendarContext } from './useCalendar.js';
import { injectEventPrimitive } from './useEventState.js';

/**
 * Drags one edge of the event it sits in. Renders nothing unless the event is editable;
 * the recipe positions it (`data-edge` says which).
 */
withDefaults(defineProps<PrimitiveProps & { edge: 'start' | 'end' }>(), { as: 'span' });

const calendar = injectCalendarContext('EventResizeHandle');
const { event } = injectEventPrimitive('EventResizeHandle');
</script>

<template>
    <Primitive
        v-if="calendar.canEdit(event())"
        :as="as"
        :as-child="asChild"
        aria-hidden="true"
        data-calendar-control
        :data-edge="edge"
        @pointerdown="
            calendar.startPointerDrag(
                $event,
                event(),
                edge === 'start' ? 'resize-start' : 'resize-end',
            )
        "
        @click.prevent.stop
    >
        <slot />
    </Primitive>
</template>
