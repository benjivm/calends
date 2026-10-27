<script lang="ts">
import type { CalendarEventInput } from '@calends/core';

export interface MonthCalendarEvent extends CalendarEventInput {
    title?: string;
    /** Any CSS color, like `var(--chart-1)`, to tint the default bar. Defaults to `primary`. */
    color?: string;
}
</script>

<script setup lang="ts" generic="T extends MonthCalendarEvent">
import type { CalendarEvent, EventSegment, WeekDay } from '@calends/core';
import {
    CalendarRoot,
    EventBar,
    EventResizeHandle,
    MonthDay,
    MonthDayMore,
    MonthGrid,
    MonthWeek,
    MonthWeekday,
    type EventDropDetail,
    type RangeSelectDetail,
} from '@calends/vue';
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui';
import CalendarToolbar from './CalendarToolbar.vue';

/**
 * A styled month view. Bars sit in their start day and stretch with `--event-span`; their state
 * attributes (`data-past`, `data-highlighted`, `data-dragging`, …) are on the bar, so the `event`
 * slot styles itself with `in-data-*` variants and should fill the bar.
 */
withDefaults(
    defineProps<{
        events?: readonly T[];
        weekStartsOn?: WeekDay;
        timeZone?: string;
        locale?: string;
        /** Lanes per week, counting the "+N more" lane that busy weeks give up a lane for. */
        maxLanes?: number;
        /** Show every event, ignoring `maxLanes`, so busy weeks grow instead of overflowing. */
        showAllEvents?: boolean;
        /** Lets events be moved and resized; listen for `event-drop` and `event-resize` to commit. */
        editable?: boolean;
        /** Lets people drag across empty days to select a range; listen for `range-select`. */
        selectable?: boolean;
        snapMinutes?: number;
        canEdit?: (event: T) => boolean;
        /** Shows placeholder bars while events load; the grid and its navigation stay usable. */
        loading?: boolean;
    }>(),
    { events: () => [], weekStartsOn: 7, maxLanes: 5, snapMinutes: 15 },
);

const emit = defineEmits<{
    'event-drop': [detail: EventDropDetail<T>];
    'event-resize': [detail: EventDropDetail<T>];
    'range-select': [detail: RangeSelectDetail];
}>();

defineSlots<{
    toolbar?(): unknown;
    event?(props: { event: T; segment: EventSegment }): unknown;
}>();

const date = defineModel<Temporal.PlainDate>('date', {
    default: () => Temporal.Now.plainDateISO(),
});

/** Inside the views the event type is erased, so the recipe restores its own. */
const sourceOf = (event: CalendarEvent) => event.source as T;

/** Placeholder bars as `[firstDay, days, lane]`, varied by week so the grid doesn't look tiled. */
const skeletonWeeks = [
    [
        [0, 3, 0],
        [4, 2, 0],
        [1, 4, 1],
    ],
    [
        [2, 4, 0],
        [0, 2, 1],
        [5, 2, 1],
    ],
    [
        [0, 5, 0],
        [3, 3, 1],
    ],
    [
        [1, 2, 0],
        [4, 3, 0],
        [2, 4, 1],
    ],
];
</script>

<template>
    <CalendarRoot
        v-model:date="date"
        :events="events"
        :week-starts-on="weekStartsOn"
        :time-zone="timeZone"
        :locale="locale"
        :max-lanes="showAllEvents ? undefined : maxLanes"
        :editable="editable"
        :selectable="selectable"
        :snap-minutes="snapMinutes"
        :can-edit="canEdit"
        class="flex flex-col gap-3"
        @event-drop="emit('event-drop', $event)"
        @event-resize="emit('event-resize', $event)"
        @range-select="emit('range-select', $event)"
    >
        <CalendarToolbar>
            <slot name="toolbar" />
        </CalendarToolbar>

        <MonthGrid
            v-slot="{ weekdays, weeks }"
            :aria-busy="loading || undefined"
            class="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xs"
        >
            <div
                role="row"
                class="grid grid-cols-7 border-b border-border bg-muted"
            >
                <MonthWeekday
                    v-for="weekday in weekdays"
                    :key="weekday.dayOfWeek"
                    :date="weekday"
                    class="px-2 py-1.5 text-xs font-medium text-muted-foreground"
                />
            </div>

            <MonthWeek
                v-for="(week, weekIndex) in weeks"
                :key="week.start.toString()"
                :week="week"
                class="relative grid min-h-[max(7rem,calc(2rem+var(--week-lanes)*1.625rem+0.375rem))] grid-cols-7 border-b border-border last:border-b-0"
            >
                <MonthDay
                    v-for="day in week.days"
                    :key="day.date.toString()"
                    :day="day"
                    class="group relative border-r border-border px-1 pt-1 outline-none last:border-r-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-outside:bg-muted/50 data-selected:bg-primary/10"
                >
                    <span
                        class="inline-flex size-6 items-center justify-center rounded-full text-sm text-foreground/80 group-data-outside:text-muted-foreground group-data-today:bg-primary group-data-today:font-semibold group-data-today:text-primary-foreground"
                    >
                        {{ day.date.day }}
                    </span>

                    <EventBar
                        v-for="segment in day.segments"
                        :key="segment.event.id"
                        :segment="segment"
                        class="absolute top-[calc(2rem+var(--event-lane)*1.625rem)] left-(--inset-start) z-10 h-6 w-[calc(var(--event-span)*100%+(var(--event-span)-1)*1px-var(--inset-start)-var(--inset-end))] rounded-sm [--inset-end:0.25rem] [--inset-start:0.25rem] data-continues-after:rounded-r-none data-continues-after:[--inset-end:-1px] data-continues-before:rounded-l-none data-continues-before:[--inset-start:0px] data-dragging:pointer-events-none data-dragging:z-30 data-dragging:shadow-lg data-editable:cursor-grab data-editable:select-none data-editable:[-webkit-touch-callout:none] data-past:opacity-60"
                    >
                        <slot
                            name="event"
                            :event="sourceOf(segment.event)"
                            :segment="segment"
                        >
                            <div
                                :tabindex="editable ? 0 : undefined"
                                :style="{ '--event-color': sourceOf(segment.event).color }"
                                class="h-full truncate rounded-[inherit] border-l-3 border-l-(--event-color) bg-(--event-color)/10 px-1.5 text-xs leading-6 text-foreground outline-none [--event-color:var(--primary)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset in-data-continues-before:border-l-0 in-data-highlighted:bg-(--event-color)/20"
                            >
                                {{ sourceOf(segment.event).title ?? segment.event.id }}
                            </div>
                        </slot>
                        <EventResizeHandle
                            v-if="!segment.continuesBefore"
                            edge="start"
                            class="absolute inset-y-0 left-0 z-10 w-1.5 cursor-ew-resize pointer-coarse:w-3"
                        />
                        <EventResizeHandle
                            v-if="!segment.continuesAfter"
                            edge="end"
                            class="absolute inset-y-0 right-0 z-10 w-1.5 cursor-ew-resize pointer-coarse:w-3"
                        />
                    </EventBar>

                    <PopoverRoot v-if="day.hiddenCount">
                        <PopoverTrigger as-child>
                            <MonthDayMore
                                :day="day"
                                class="absolute top-[calc(2rem+var(--week-visible-lanes)*1.625rem)] right-1 left-1 z-10 h-6 rounded-sm px-1.5 text-left text-xs font-medium text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </PopoverTrigger>

                        <PopoverPortal>
                            <PopoverContent
                                align="start"
                                :side-offset="4"
                                class="z-50 w-72 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md outline-none"
                            >
                                <div class="px-1 pb-2 text-xs font-medium text-muted-foreground">
                                    {{ day.date.toLocaleString(locale, { dateStyle: 'full' }) }}
                                </div>

                                <ul class="flex max-h-80 flex-col gap-1 overflow-y-auto">
                                    <li
                                        v-for="segment in day.coveringSegments"
                                        :key="segment.event.id"
                                    >
                                        <EventBar
                                            :segment="segment"
                                            class="relative h-6 rounded-sm data-past:opacity-60"
                                        >
                                            <slot
                                                name="event"
                                                :event="sourceOf(segment.event)"
                                                :segment="segment"
                                            >
                                                <div
                                                    :tabindex="editable ? 0 : undefined"
                                                    :style="{
                                                        '--event-color': sourceOf(segment.event)
                                                            .color,
                                                    }"
                                                    class="h-full truncate rounded-[inherit] border-l-3 border-l-(--event-color) bg-(--event-color)/10 px-1.5 text-xs leading-6 text-foreground outline-none [--event-color:var(--primary)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset in-data-highlighted:bg-(--event-color)/20"
                                                >
                                                    {{
                                                        sourceOf(segment.event).title ??
                                                        segment.event.id
                                                    }}
                                                </div>
                                            </slot>
                                        </EventBar>
                                    </li>
                                </ul>
                            </PopoverContent>
                        </PopoverPortal>
                    </PopoverRoot>
                </MonthDay>

                <div
                    v-if="loading"
                    class="pointer-events-none absolute inset-0 grid grid-cols-7"
                    aria-hidden="true"
                >
                    <span
                        v-for="([firstDay, days, lane], barIndex) in skeletonWeeks[
                            weekIndex % skeletonWeeks.length
                        ]"
                        :key="barIndex"
                        :style="{
                            gridColumn: `${firstDay + 1} / span ${days}`,
                            '--event-lane': lane,
                        }"
                        class="row-start-1 mx-1 mt-[calc(2rem+var(--event-lane)*1.625rem)] h-6 animate-pulse self-start rounded-sm bg-muted motion-reduce:animate-none"
                    />
                </div>
            </MonthWeek>
        </MonthGrid>
    </CalendarRoot>
</template>
