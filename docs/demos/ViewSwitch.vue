<script setup lang="ts" generic="V extends string">
const value = defineModel<V>({ required: true });

defineProps<{
    /** Names the group for screen readers, like "View". */
    label: string;
    options: readonly { value: V; label: string }[];
}>();
</script>

<template>
    <div
        role="group"
        :aria-label="label"
        class="inline-flex h-8 items-center rounded-md bg-muted p-0.5 text-sm"
    >
        <button
            v-for="option in options"
            :key="option.value"
            type="button"
            :aria-pressed="value === option.value"
            class="h-7 rounded-sm px-2.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs"
            @click="value = option.value"
        >
            {{ option.label }}
        </button>
    </div>
</template>
