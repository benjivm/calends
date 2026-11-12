<script setup lang="ts">
import { computed } from 'vue';
import type { TimelineRow } from '@calends/core';
import { Primitive, type PrimitiveProps } from './Primitive.js';
import { injectCalendarContext } from './useCalendar.js';

const props = withDefaults(defineProps<PrimitiveProps & { row: TimelineRow<any, any> }>(), {
    as: 'div',
});

const { resources } = injectCalendarContext('TimelineRow');

/** Without `resources`, the single row holds every event rather than the leftovers. */
const isUnassigned = computed(() => !!resources.value && !props.row.resource);
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="group"
        :aria-label="isUnassigned ? 'Unassigned' : undefined"
        :style="{ '--row-lanes': Math.max(row.laneCount, 1) }"
        :data-unassigned="isUnassigned ? '' : undefined"
        :data-idle="row.items.length ? undefined : ''"
    >
        <slot
            :row="row"
            :resource="row.resource"
            :items="row.items"
        />
    </Primitive>
</template>
