<script lang="ts">
import type { CalendarEventInput, CalendarResource } from '@calends/core';

export interface TimelineCalendarEvent extends CalendarEventInput {
    title?: string;
}

export interface TimelineCalendarResource extends CalendarResource {
    title?: string;
    name?: string;
}
</script>

<script
    setup
    lang="ts"
    generic="T extends TimelineCalendarEvent, R extends TimelineCalendarResource"
>
import { nextTick, onMounted, useTemplateRef, watch } from 'vue';
import type {
    CalendarEvent,
    ResourceId,
    TimelineItem,
    TimelineRow as TimelineRowData,
    WeekDay,
} from '@calends/core';
import {
    CalendarRoot,
    EventResizeHandle,
    Timeline,
    TimelineEvent,
    TimelineNow,
    TimelineRow,
    TimelineSelection,
    TimelineTrack,
    type EventDropDetail,
    type RangeSelectDetail,
} from '@calends/vue';
import CalendarToolbar from './CalendarToolbar.vue';

/**
 * Hours run left to right across a day or week, with one row per resource, or a single row when
 * `resources` is left unset. The `event` slot renders inside the positioned event, which carries
 * the state attributes: style its content with `in-data-*` variants.
 */
const props = withDefaults(
    defineProps<{
        events?: readonly T[];
        resources?: readonly R[];
        getResourceIds?: (event: T) => readonly ResourceId[] | null | undefined;
        resourceLabel?: (resource: R) => string;
        resourceHeading?: string;
        /** Names a trailing row for events that match no resource; leave unset to drop them. */
        unassignedLabel?: string;
        view?: 'day' | 'week';
        /** First and last hour on each day's stretch of the axis. */
        startHour?: number;
        endHour?: number;
        slotMinutes?: number;
        /** Hour the track scrolls to when it first renders, on today if it's in view. */
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
        resourceLabel: (resource: TimelineCalendarResource) =>
            resource.title ?? resource.name ?? String(resource.id),
        resourceHeading: 'Resource',
        view: 'day',
        startHour: 0,
        endHour: 24,
        slotMinutes: 60,
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
    resource?(props: { resource: R | null; row: TimelineRowData }): unknown;
    event?(props: { event: T; item: TimelineItem; resource: R | null; timeLabel: string }): unknown;
}>();

const date = defineModel<Temporal.PlainDate>('date', {
    default: () => Temporal.Now.plainDateISO(),
});

const scroller = useTemplateRef('scroller');

/** Scrolls the track to `scrollToHour`, on today when it's in view. */
function scrollToStart() {
    const container = scroller.value;
    const day =
        container?.querySelector<HTMLElement>('[data-day][data-today]') ??
        container?.querySelector<HTMLElement>('[data-day]');
    const label = container?.querySelector<HTMLElement>('[data-label-column]');

    if (!container || !day) return;

    const containerLeft = container.getBoundingClientRect().left;
    const dayBox = day.getBoundingClientRect();
    const fraction = (props.scrollToHour - props.startHour) / (props.endHour - props.startHour);
    const target = dayBox.left - containerLeft + container.scrollLeft + dayBox.width * fraction;

    container.scrollLeft = Math.max(target - (label?.offsetWidth ?? 0) - 16, 0);
}

onMounted(scrollToStart);

watch(
    () => props.view,
    () => nextTick(scrollToStart),
);

/** Inside the views the event and resource types are erased, so the recipe restores its own. */
const sourceOf = (event: CalendarEvent) => event.source as T;
const resourceOf = (row: TimelineRowData) => row.resource as R | null;

const labelFor = (row: TimelineRowData) => {
    const resource = resourceOf(row);

    return resource ? props.resourceLabel(resource) : props.unassignedLabel;
};

const slotLabel = (minutes: number) =>
    Temporal.PlainTime.from({
        hour: Math.floor(minutes / 60),
        minute: minutes % 60,
    }).toLocaleString(props.locale, {
        hour: 'numeric',
        minute: minutes % 60 ? '2-digit' : undefined,
    });

const timeLabel = (event: CalendarEvent) =>
    event.allDay
        ? 'All day'
        : event.start.toLocaleString(props.locale, { hour: 'numeric', minute: '2-digit' });
</script>

<template>
    <CalendarRoot
        v-model:date="date"
        :view="view"
        :events="events"
        :resources="resources"
        :get-resource-ids="getResourceIds"
        :unassigned="Boolean(unassignedLabel)"
        :week-starts-on="weekStartsOn"
        :time-zone="timeZone"
        :locale="locale"
        :slot-min-minutes="startHour * 60"
        :slot-max-minutes="endHour * 60"
        :slot-minutes="slotMinutes"
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

        <Timeline
            v-slot="{ days, rows }"
            :class="[
                'overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xs [--slot-width:4rem]',
                resources ? '[--label-width:12rem]' : '[--label-width:0rem]',
            ]"
        >
            <div
                ref="scroller"
                class="overflow-x-auto"
            >
                <div
                    class="relative min-w-[calc(var(--label-width)+var(--slot-count)*var(--slot-width))]"
                >
                    <div
                        class="grid grid-cols-[var(--label-width)_minmax(0,1fr)] border-b border-border bg-muted"
                    >
                        <div
                            data-label-column
                            class="sticky left-0 z-20 row-span-2 flex items-end bg-muted text-xs font-medium text-muted-foreground"
                            :class="resources ? 'border-r border-border px-3 py-1.5' : ''"
                        >
                            <template v-if="resources">{{ resourceHeading }}</template>
                        </div>

                        <div class="relative h-7 border-b border-border">
                            <div
                                v-for="day in days"
                                :key="day.date.toString()"
                                data-day
                                :data-today="day.isToday ? '' : undefined"
                                class="absolute inset-y-0 left-[calc(var(--day-offset)/var(--axis-minutes)*100%)] flex w-[calc(var(--window-minutes)/var(--axis-minutes)*100%)] items-center gap-1.5 border-l border-border px-2 text-xs font-medium text-foreground/80 first:border-l-0 data-today:text-primary"
                                :style="{ '--day-offset': day.offset }"
                            >
                                {{
                                    day.date.toLocaleString(locale, {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                    })
                                }}
                            </div>
                        </div>

                        <div class="relative h-6">
                            <template
                                v-for="day in days"
                                :key="day.date.toString()"
                            >
                                <span
                                    v-for="slot in day.slots"
                                    :key="slot"
                                    class="absolute top-1 left-[calc((var(--day-offset)+var(--slot)-var(--slot-min))/var(--axis-minutes)*100%)] pl-1 text-xs text-muted-foreground"
                                    :style="{
                                        '--day-offset': day.offset,
                                        '--slot': slot,
                                        '--slot-min': day.slots[0],
                                    }"
                                >
                                    {{ slotLabel(slot) }}
                                </span>
                            </template>
                        </div>
                    </div>

                    <TimelineRow
                        v-for="row in rows"
                        :key="row.resource?.id ?? 'unassigned'"
                        :row="row"
                        :aria-label="labelFor(row)"
                        class="grid min-h-[calc(var(--row-lanes)*1.625rem+0.5rem)] grid-cols-[var(--label-width)_minmax(0,1fr)] border-b border-border last:border-b-0"
                    >
                        <div
                            class="sticky left-0 z-20 flex min-w-0 items-center bg-card"
                            :class="resources ? 'border-r border-border px-3' : ''"
                        >
                            <slot
                                v-if="resources"
                                name="resource"
                                :resource="resourceOf(row)"
                                :row="row"
                            >
                                <span
                                    :class="[
                                        'truncate text-sm font-medium',
                                        row.resource
                                            ? 'text-foreground'
                                            : 'text-muted-foreground italic',
                                    ]"
                                >
                                    {{ labelFor(row) }}
                                </span>
                            </slot>
                        </div>

                        <TimelineTrack
                            :row="row"
                            class="relative bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px)] bg-size-[calc(100%/var(--slot-count))_100%]"
                        >
                            <TimelineEvent
                                v-for="item in row.items"
                                :key="item.event.id"
                                :item="item"
                                :resource-id="resources ? (row.resource?.id ?? null) : undefined"
                                class="absolute top-[calc(0.25rem+var(--event-lane)*1.625rem)] left-[calc(var(--event-start)/var(--axis-minutes)*100%+1px)] z-10 h-6 w-[max(calc((var(--event-end)-var(--event-start))/var(--axis-minutes)*100%-2px),0.75rem)] rounded-sm data-dragging:pointer-events-none data-dragging:z-30 data-dragging:shadow-lg data-editable:cursor-grab data-ends-after:rounded-r-none data-past:opacity-60 data-starts-before:rounded-l-none"
                            >
                                <slot
                                    name="event"
                                    :event="sourceOf(item.event)"
                                    :item="item"
                                    :resource="resourceOf(row)"
                                    :time-label="timeLabel(item.event)"
                                >
                                    <div
                                        :tabindex="editable ? 0 : undefined"
                                        class="flex h-full items-center gap-1.5 overflow-hidden rounded-[inherit] border-l-3 border-l-primary bg-primary/10 px-1.5 text-xs leading-6 whitespace-nowrap text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset in-data-highlighted:bg-primary/20"
                                    >
                                        <span class="min-w-0 truncate font-semibold">
                                            {{ sourceOf(item.event).title ?? item.event.id }}
                                        </span>
                                        <span
                                            class="min-w-0 shrink-[100] truncate text-muted-foreground"
                                        >
                                            {{ timeLabel(item.event) }}
                                        </span>
                                    </div>
                                </slot>
                                <EventResizeHandle
                                    v-if="!item.startsBefore"
                                    edge="start"
                                    class="absolute inset-y-0 left-0 z-10 w-1.5 cursor-ew-resize"
                                />
                                <EventResizeHandle
                                    v-if="!item.endsAfter"
                                    edge="end"
                                    class="absolute inset-y-0 right-0 z-10 w-1.5 cursor-ew-resize"
                                />
                            </TimelineEvent>

                            <TimelineSelection
                                :row="row"
                                class="pointer-events-none absolute inset-y-1 left-[calc(var(--selection-start)/var(--axis-minutes)*100%)] z-5 w-[calc((var(--selection-end)-var(--selection-start))/var(--axis-minutes)*100%)] rounded-sm bg-primary/15 ring-1 ring-primary/40 ring-inset"
                            />
                        </TimelineTrack>
                    </TimelineRow>

                    <div
                        class="pointer-events-none absolute inset-y-0 right-0 left-(--label-width)"
                    >
                        <TimelineNow
                            class="absolute inset-y-0 left-[calc(var(--now)/var(--axis-minutes)*100%)] z-15 w-0.5 bg-red-500"
                        />
                    </div>
                </div>
            </div>
        </Timeline>
    </CalendarRoot>
</template>
