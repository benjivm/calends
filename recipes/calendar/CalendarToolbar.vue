<script setup lang="ts">
import { CalendarHeading, CalendarNav, injectCalendarContext } from '@calends/vue';

/** Today, previous, next, and the period title. The default slot sits at the far end. */
const { view } = injectCalendarContext('CalendarToolbar');

const iconButton =
    'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50';
</script>

<template>
    <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
            <CalendarNav
                action="today"
                class="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-sm font-medium shadow-xs outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
                Today
            </CalendarNav>

            <div class="flex items-center gap-1">
                <CalendarNav
                    action="prev"
                    :aria-label="`Previous ${view}`"
                    :class="iconButton"
                >
                    <svg
                        class="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                    >
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                </CalendarNav>
                <CalendarNav
                    action="next"
                    :aria-label="`Next ${view}`"
                    :class="iconButton"
                >
                    <svg
                        class="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                    >
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </CalendarNav>
            </div>

            <CalendarHeading class="text-lg font-semibold text-foreground" />
        </div>

        <slot />
    </div>
</template>
