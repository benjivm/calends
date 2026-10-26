<script setup lang="ts">
import type { ResourceRow } from '@calends/core';
import { Primitive, type PrimitiveProps } from 'reka-ui';

withDefaults(defineProps<PrimitiveProps & { row: ResourceRow<any, any> }>(), { as: 'div' });
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="row"
        :style="{ '--row-lanes': Math.max(row.laneCount, 1) }"
        :data-unassigned="row.resource ? undefined : ''"
        :data-idle="row.busyDays ? undefined : ''"
        :data-overlap="row.overlapDays ? '' : undefined"
    >
        <slot
            :row="row"
            :resource="row.resource"
            :cells="row.cells"
        />
    </Primitive>
</template>
