<script lang="ts">
export interface CalendarSource {
    id: string;
    label: string;
    /** Any CSS color, like `var(--chart-1)`. Give the source's events the same `color`. */
    color?: string;
}
</script>

<script setup lang="ts" generic="S extends CalendarSource">
/**
 * A legend of calendar sources, each a toggle. It only tracks which are hidden: the app filters
 * its events with `v-model:hidden`, so a source's events can keep loading while it's off.
 */
withDefaults(
    defineProps<{
        sources: readonly S[];
        /** Names the group for screen readers. */
        label?: string;
    }>(),
    { label: 'Calendars' },
);

defineSlots<{
    source?(props: { source: S; visible: boolean }): unknown;
}>();

const hidden = defineModel<string[]>('hidden', { default: () => [] });

function toggle(id: string) {
    hidden.value = hidden.value.includes(id)
        ? hidden.value.filter((other) => other !== id)
        : [...hidden.value, id];
}
</script>

<template>
    <div
        role="group"
        :aria-label="label"
        class="flex flex-wrap items-center gap-1.5"
    >
        <button
            v-for="source in sources"
            :key="source.id"
            type="button"
            :aria-pressed="!hidden.includes(source.id)"
            :style="{ '--source-color': source.color }"
            @click="toggle(source.id)"
            class="group inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-sm font-medium text-foreground shadow-xs outline-none [--source-color:var(--primary)] hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-[pressed=false]:text-muted-foreground"
        >
            <span
                aria-hidden="true"
                class="flex size-3.5 items-center justify-center rounded-sm border-2 border-(--source-color) bg-(--source-color) text-background group-aria-[pressed=false]:bg-transparent"
            >
                <svg
                    class="size-2.5 group-aria-[pressed=false]:hidden"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M20 6 9 17l-5-5" />
                </svg>
            </span>
            <slot
                name="source"
                :source="source"
                :visible="!hidden.includes(source.id)"
            >
                {{ source.label }}
            </slot>
        </button>
    </div>
</template>
