<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { injectCalendarContext } from './useCalendar.js';

withDefaults(defineProps<PrimitiveProps>(), { as: 'h2' });

const { title } = injectCalendarContext('CalendarHeading');
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        aria-live="polite"
    >
        <slot :title="title">{{ title }}</slot>
    </Primitive>
</template>
