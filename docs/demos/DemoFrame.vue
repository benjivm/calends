<script setup lang="ts">
/** The frame every demo shares: options above, the recipe, and a live line saying what happened. */
defineProps<{ status: string }>();
</script>

<template>
    <div class="calendar-demo vp-raw my-6 flex flex-col gap-3">
        <div
            v-if="$slots.options"
            class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground"
        >
            <slot name="options" />
        </div>

        <slot />

        <p
            class="text-sm text-muted-foreground"
            aria-live="polite"
        >
            {{ status }}
        </p>
    </div>
</template>
