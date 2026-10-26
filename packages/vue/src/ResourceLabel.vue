<script setup lang="ts">
import type { ResourceRow } from '@calends/core';
import { Primitive, type PrimitiveProps } from 'reka-ui';

withDefaults(defineProps<PrimitiveProps & { row: ResourceRow<any, any> }>(), { as: 'div' });
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="rowheader"
    >
        <slot
            :row="row"
            :resource="row.resource"
            :busy-days="row.busyDays"
            :overlap-days="row.overlapDays"
        />
    </Primitive>
</template>
