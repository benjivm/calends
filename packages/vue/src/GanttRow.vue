<script setup lang="ts">
import type { GanttRow } from '@calends/core';
import { Primitive, type PrimitiveProps } from 'reka-ui';

withDefaults(defineProps<PrimitiveProps & { row: GanttRow<any> }>(), { as: 'div' });
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="group"
        :data-row-event-id="row.event.id"
    >
        <slot
            :row="row"
            :event="row.event"
        />
    </Primitive>
</template>
