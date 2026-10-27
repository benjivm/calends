<script setup lang="ts">
import type { TimelineRow } from '@calends/core';
import { Primitive, type PrimitiveProps } from './Primitive.js';

withDefaults(defineProps<PrimitiveProps & { row: TimelineRow<any, any> }>(), { as: 'div' });
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="group"
        :aria-label="row.resource ? undefined : 'Unassigned'"
        :style="{ '--row-lanes': Math.max(row.laneCount, 1) }"
        :data-unassigned="row.resource ? undefined : ''"
        :data-idle="row.items.length ? undefined : ''"
    >
        <slot
            :row="row"
            :resource="row.resource"
            :items="row.items"
        />
    </Primitive>
</template>
