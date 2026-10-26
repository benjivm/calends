<script setup lang="ts">
import type { TimelineRow } from '@calends/core';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { injectCalendarContext } from './useCalendar.js';

/** A row's time axis: events, selections, and drops are measured against its width. */
const props = withDefaults(defineProps<PrimitiveProps & { row: TimelineRow<any, any> }>(), {
    as: 'div',
});

const { timeline, resources } = injectCalendarContext('TimelineTrack');
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        data-drop="axis"
        :data-axis-minutes="timeline.axisMinutes"
        :data-resource-id="resources ? String(props.row.resource?.id ?? '') : undefined"
    >
        <slot />
    </Primitive>
</template>
