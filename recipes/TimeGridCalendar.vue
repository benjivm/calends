<script lang="ts">
import type { CalendarEventInput } from '@calends/core';

export interface TimeGridCalendarEvent extends CalendarEventInput {
    title?: string;
}
</script>

<script setup lang="ts" generic="T extends TimeGridCalendarEvent">
import { onMounted, useTemplateRef } from 'vue';
import type { CalendarEvent, EventSegment, TimedEventLayout, WeekDay } from '@calends/core';
import {
    CalendarRoot,
    EventBar,
    EventResizeHandle,
    NowIndicator,
    TimeColumn,
    TimeEvent,
    TimeGrid,
    TimeSelection,
    type EventDropDetail,
    type RangeSelectDetail,
} from '@calends/vue';
import CalendarToolbar from './CalendarToolbar.vue';

/**
 * A week or day of hours, with all-day events in a row above them. The `event` and
 * `all-day-event` slots render inside the positioned event, which carries the state attributes:
 * style their content with `in-data-*` variants.
 */
const props = withDefaults(
    defineProps<{
        events?: readonly T[];
        view?: 'week' | 'day';
        /** First and last hour drawn each day. */
        startHour?: number;
        endHour?: number;
        /** Hour the body scrolls to when it first renders. */
        scrollToHour?: number;
        weekStartsOn?: WeekDay;
        timeZone?: string;
        locale?: string;
        /** Lets events be moved and resized; listen for `event-drop` and `event-resize` to commit. */
        editable?: boolean;
        /** Lets people click or drag across empty hours to select a range; listen for `range-select`. */
        selectable?: boolean;
        snapMinutes?: number;
        canEdit?: (event: T) => boolean;
    }>(),
    {
        events: () => [],
        view: 'week',
        startHour: 0,
        endHour: 24,
        scrollToHour: 7,
        weekStartsOn: 7,
        snapMinutes: 15,
    },
);

const emit = defineEmits<{
    'event-drop': [detail: EventDropDetail<T>];
    'event-resize': [detail: EventDropDetail<T>];
    'range-select': [detail: RangeSelectDetail];
}>();

defineSlots<{
    toolbar?(): unknown;
    event?(props: { event: T; layout: TimedEventLayout; timeLabel: string }): unknown;
    'all-day-event'?(props: { event: T; segment: EventSegment }): unknown;
}>();

const date = defineModel<Temporal.PlainDate>('date', {
    default: () => Temporal.Now.plainDateISO(),
});

const body = useTemplateRef('body');

onMounted(() => {
    const window = (props.endHour - props.startHour) * 60;
    // Half an hour early, so the target hour's label isn't clipped at the top edge.
    const offset = (props.scrollToHour - props.startHour) * 60 - 30;

    if (body.value && offset > 0) {
        body.value.scrollTop = (body.value.scrollHeight * offset) / window;
    }
});

/** Inside the views the event type is erased, so the recipe restores its own. */
const sourceOf = (event: CalendarEvent) => event.source as T;

const hourLabel = (minutes: number) =>
    Temporal.PlainTime.from({ hour: minutes / 60 }).toLocaleString(props.locale, {
        hour: 'numeric',
    });

/** Too short for two lines, so the title and time share one. */
const isShort = (layout: TimedEventLayout) => layout.endMinutes - layout.startMinutes < 45;

const timeLabel = (event: CalendarEvent) =>
    event.start.toLocaleString(props.locale, { hour: 'numeric', minute: '2-digit' });
</script>

<template>
    <CalendarRoot
        v-model:date="date"
        :view="view"
        :events="events"
        :week-starts-on="weekStartsOn"
        :time-zone="timeZone"
        :locale="locale"
        :slot-min-minutes="startHour * 60"
        :slot-max-minutes="endHour * 60"
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

        <TimeGrid
            v-slot="{ days, allDay, hours }"
            class="flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xs [--gutter:4rem] [--hour-height:3rem]"
        >
            <div
                class="grid grid-cols-[var(--gutter)_repeat(var(--day-count),minmax(0,1fr))] border-b border-border bg-muted"
            >
                <div class="border-r border-border" />
                <div
                    v-for="day in days"
                    :key="day.date.toString()"
                    :data-today="day.isToday ? '' : undefined"
                    class="group flex items-baseline gap-1.5 border-r border-border px-2 py-1.5 text-xs text-muted-foreground last:border-r-0"
                >
                    <span class="font-medium">
                        {{ day.date.toLocaleString(locale, { weekday: 'short' }) }}
                    </span>
                    <span
                        class="text-sm text-foreground/80 group-data-today:inline-flex group-data-today:size-6 group-data-today:items-center group-data-today:justify-center group-data-today:rounded-full group-data-today:bg-primary group-data-today:font-semibold group-data-today:text-primary-foreground"
                    >
                        {{ day.date.day }}
                    </span>
                </div>
            </div>

            <div
                class="grid grid-cols-[var(--gutter)_repeat(var(--day-count),minmax(0,1fr))] border-b border-border"
            >
                <div
                    class="flex items-center justify-end border-r border-border px-2 text-xs text-muted-foreground"
                >
                    All day
                </div>
                <div
                    class="relative col-[2/-1] min-h-[calc(max(var(--all-day-lanes),1)*1.625rem+0.5rem)]"
                >
                    <!-- Plain cells, but with the drop attributes, so all-day bars can be dragged along the row. -->
                    <div
                        class="absolute inset-0 grid grid-cols-[repeat(var(--day-count),minmax(0,1fr))]"
                    >
                        <div
                            v-for="day in days"
                            :key="day.date.toString()"
                            data-drop="day"
                            :data-date="day.date.toString()"
                            class="border-r border-border last:border-r-0"
                        />
                    </div>

                    <EventBar
                        v-for="segment in allDay.segments"
                        :key="segment.event.id"
                        :segment="segment"
                        :keyboard-axes="{ horizontal: 'day', vertical: 'none' }"
                        class="absolute top-[calc(0.25rem+var(--event-lane)*1.625rem)] left-[calc(var(--event-column)/var(--day-count)*100%+0.25rem)] z-10 h-6 w-[calc(var(--event-span)/var(--day-count)*100%-0.5rem)] rounded-sm data-continues-after:rounded-r-none data-continues-before:rounded-l-none data-dragging:pointer-events-none data-dragging:z-30 data-dragging:shadow-lg data-editable:cursor-grab data-editable:select-none data-editable:[-webkit-touch-callout:none] data-past:opacity-60"
                    >
                        <slot
                            name="all-day-event"
                            :event="sourceOf(segment.event)"
                            :segment="segment"
                        >
                            <div
                                :tabindex="editable ? 0 : undefined"
                                class="h-full truncate rounded-[inherit] border-l-3 border-l-primary bg-primary/10 px-1.5 text-xs leading-6 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset in-data-highlighted:bg-primary/20"
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
                </div>
            </div>

            <div
                ref="body"
                class="max-h-[36rem] overflow-y-auto"
            >
                <div
                    class="grid h-[calc(var(--window-minutes)/60*var(--hour-height))] grid-cols-[var(--gutter)_repeat(var(--day-count),minmax(0,1fr))]"
                >
                    <div class="relative border-r border-border">
                        <span
                            v-for="minutes in hours.slice(1)"
                            :key="minutes"
                            class="absolute top-[calc((var(--hour)-var(--first-hour))/60*var(--hour-height))] right-2 -translate-y-1/2 text-xs text-muted-foreground"
                            :style="{ '--hour': minutes, '--first-hour': hours[0] }"
                        >
                            {{ hourLabel(minutes) }}
                        </span>
                    </div>

                    <TimeColumn
                        v-for="day in days"
                        :key="day.date.toString()"
                        :day="day"
                        class="relative border-r border-border bg-[linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[100%_var(--hour-height)] outline-none last:border-r-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-today:bg-primary/4 data-weekend:bg-muted/50"
                    >
                        <TimeEvent
                            v-for="layout in day.events"
                            :key="layout.event.id"
                            :layout="layout"
                            class="absolute top-(--event-offset) left-[calc(var(--event-column)*(100%-0.5rem)/var(--event-columns)+1px)] z-10 h-[calc(var(--event-length)-2px)] min-h-5 w-[calc((100%-0.5rem)/var(--event-columns)-2px)] rounded-sm data-dragging:pointer-events-none data-dragging:z-30 data-dragging:shadow-lg data-editable:cursor-grab data-editable:select-none data-editable:[-webkit-touch-callout:none] data-ends-after:rounded-b-none data-past:opacity-60 data-starts-before:rounded-t-none"
                        >
                            <slot
                                name="event"
                                :event="sourceOf(layout.event)"
                                :layout="layout"
                                :time-label="timeLabel(layout.event)"
                            >
                                <div
                                    :tabindex="editable ? 0 : undefined"
                                    :class="[
                                        'flex h-full overflow-hidden rounded-[inherit] border-l-3 border-l-primary bg-primary/10 px-1.5 text-xs leading-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset in-data-highlighted:bg-primary/20',
                                        isShort(layout)
                                            ? 'items-center gap-1.5 py-0'
                                            : 'flex-col py-0.5',
                                    ]"
                                >
                                    <span class="min-w-0 truncate font-semibold">
                                        {{ sourceOf(layout.event).title ?? layout.event.id }}
                                    </span>
                                    <span
                                        class="min-w-0 shrink-[100] truncate text-muted-foreground"
                                    >
                                        {{ timeLabel(layout.event) }}
                                    </span>
                                </div>
                            </slot>
                            <EventResizeHandle
                                v-if="!layout.startsBefore"
                                edge="start"
                                class="absolute inset-x-0 top-0 z-10 h-1.5 cursor-ns-resize pointer-coarse:h-2.5"
                            />
                            <EventResizeHandle
                                v-if="!layout.endsAfter"
                                edge="end"
                                class="absolute inset-x-0 bottom-0 z-10 h-1.5 cursor-ns-resize pointer-coarse:h-2.5"
                            />
                        </TimeEvent>

                        <TimeSelection
                            :day="day"
                            class="pointer-events-none absolute inset-x-1 top-(--selection-offset) z-5 h-(--selection-length) rounded-sm bg-primary/15 ring-1 ring-primary/40 ring-inset"
                        />

                        <NowIndicator
                            :day="day"
                            class="pointer-events-none absolute inset-x-0 top-(--now-offset) z-20 h-0.5 bg-red-500 before:absolute before:-top-[3px] before:-left-1 before:size-2 before:rounded-full before:bg-red-500"
                        />
                    </TimeColumn>
                </div>
            </div>
        </TimeGrid>
    </CalendarRoot>
</template>
