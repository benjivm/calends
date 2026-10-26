<script setup lang="ts">
import type { MonthWeek } from '@calends/core';
import { Primitive, type PrimitiveProps } from 'reka-ui';

withDefaults(defineProps<PrimitiveProps & { week: MonthWeek<any> }>(), { as: 'div' });
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="row"
        :style="{
            '--week-lanes': week.visibleLaneCount + (week.hasOverflow ? 1 : 0),
            '--week-visible-lanes': week.visibleLaneCount,
        }"
        :data-overflow="week.hasOverflow ? '' : undefined"
    >
        <slot
            :week="week"
            :days="week.days"
        />
    </Primitive>
</template>
