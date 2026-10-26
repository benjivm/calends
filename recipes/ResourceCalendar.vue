<script lang="ts">
import type { CalendarEventInput, CalendarResource } from '@calends/core';

export interface ResourceCalendarEvent extends CalendarEventInput {
    title?: string;
}

export interface ResourceCalendarResource extends CalendarResource {
    title?: string;
    name?: string;
}
</script>

<script
    setup
    lang="ts"
    generic="T extends ResourceCalendarEvent, R extends ResourceCalendarResource"
>
import type {
    CalendarEvent,
    EventSegment,
    ResourceId,
    ResourceRow as ResourceRowData,
    WeekDay,
} from '@calends/core';
import {
    CalendarRoot,
    EventBar,
    EventResizeHandle,
    ResourceCell,
    ResourceDayHeader,
    ResourceGrid,
    ResourceLabel,
    ResourceRow,
    type EventDropDetail,
    type RangeSelectDetail,
} from '@calends/vue';
import CalendarToolbar from './CalendarToolbar.vue';

/**
 * One row per resource across the days of a week or month, in the order of `resources`, idle ones
 * included. Like `MonthCalendar`, the `event` slot renders inside the positioned bar: style it from
 * the bar's state with `in-data-*` variants.
 */
const props = withDefaults(
    defineProps<{
        events?: readonly T[];
        resources?: readonly R[];
        /** Which resources an event belongs to. One with several shows in each of their rows. */
        getResourceIds: (event: T) => readonly ResourceId[] | null | undefined;
        resourceLabel?: (resource: R) => string;
        resourceHeading?: string;
        /** Names a trailing row for events that match no resource; leave unset to drop them. */
        unassignedLabel?: string;
        period?: 'week' | 'month';
        weekStartsOn?: WeekDay;
        timeZone?: string;
        locale?: string;
        /** Lets events be moved and resized; listen for `event-drop` and `event-resize` to commit. */
        editable?: boolean;
        /** Lets people click or drag across empty days to select a range; listen for `range-select`. */
        selectable?: boolean;
        snapMinutes?: number;
        canEdit?: (event: T) => boolean;
        /** Swaps the rows for placeholders while resources or events load; navigation stays usable. */
        loading?: boolean;
    }>(),
    {
        events: () => [],
        resources: () => [],
        resourceLabel: (resource: ResourceCalendarResource) =>
            resource.title ?? resource.name ?? String(resource.id),
        resourceHeading: 'Resource',
        period: 'week',
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
    resource?(props: { resource: R | null; row: ResourceRowData }): unknown;
    event?(props: { event: T; segment: EventSegment; resource: R | null }): unknown;
}>();

const date = defineModel<Temporal.PlainDate>('date', {
    default: () => Temporal.Now.plainDateISO(),
});

/** Inside the views the event and resource types are erased, so the recipe restores its own. */
const sourceOf = (event: CalendarEvent) => event.source as T;
const resourceOf = (row: ResourceRowData) => row.resource as R | null;

const labelFor = (row: ResourceRowData) => {
    const resource = resourceOf(row);

    return resource ? props.resourceLabel(resource) : props.unassignedLabel;
};

const bookedSummary = (row: ResourceRowData) =>
    row.busyDays ? `${row.busyDays} ${row.busyDays === 1 ? 'day' : 'days'} booked` : 'Free';

/**
 * Placeholder rows: a label width and bars as `[start, length]` fractions of the range, so they
 * scale from a week to a month.
 */
const skeletonRows = [
    { label: 'w-28', bars: [[0, 0.43]] },
    {
        label: 'w-36',
        bars: [
            [0.14, 0.29],
            [0.57, 0.43],
        ],
    },
    { label: 'w-24', bars: [] },
    { label: 'w-32', bars: [[0.29, 0.57]] },
    {
        label: 'w-28',
        bars: [
            [0, 0.29],
            [0.71, 0.29],
        ],
    },
];

const skeletonColumn = ([start, length]: number[], dayCount: number) => {
    const first = Math.min(Math.round(start * dayCount), dayCount - 1);
    const span = Math.max(Math.round(length * dayCount), 1);

    return `${first + 2} / span ${Math.min(span, dayCount - first)}`;
};
</script>

<template>
    <CalendarRoot
        v-model:date="date"
        :view="period"
        :events="events"
        :resources="resources"
        :get-resource-ids="getResourceIds"
        :unassigned="Boolean(unassignedLabel)"
        :week-starts-on="weekStartsOn"
        :time-zone="timeZone"
        :locale="locale"
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

        <ResourceGrid
            v-slot="{ days, rows }"
            :aria-busy="loading || undefined"
            :class="[
                'overflow-x-auto rounded-lg border border-border bg-card text-card-foreground shadow-xs [--label-width:13rem]',
                period === 'month' ? '[--day-min:2.5rem]' : '[--day-min:6rem]',
            ]"
        >
            <div class="min-w-[calc(var(--label-width)+var(--day-count)*var(--day-min))]">
                <div
                    role="row"
                    class="grid grid-cols-[var(--label-width)_repeat(var(--day-count),minmax(var(--day-min),1fr))] border-b border-border bg-muted"
                >
                    <div
                        role="columnheader"
                        class="sticky left-0 z-20 flex items-end border-r border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
                    >
                        {{ resourceHeading }}
                    </div>
                    <ResourceDayHeader
                        v-for="day in days"
                        :key="day.date.toString()"
                        v-slot="{ weekday }"
                        :day="day"
                        :class="[
                            'group flex border-r border-border py-1 text-xs text-muted-foreground last:border-r-0',
                            period === 'month'
                                ? 'flex-col items-center leading-tight'
                                : 'items-baseline gap-1.5 px-2',
                        ]"
                    >
                        <span class="font-medium">
                            {{ period === 'month' ? weekday.slice(0, 2) : weekday }}
                        </span>
                        <span
                            class="text-sm text-foreground/80 group-data-today:inline-flex group-data-today:size-6 group-data-today:items-center group-data-today:justify-center group-data-today:rounded-full group-data-today:bg-primary group-data-today:font-semibold group-data-today:text-primary-foreground"
                        >
                            {{ day.date.day }}
                        </span>
                    </ResourceDayHeader>
                </div>

                <ResourceRow
                    v-for="(row, rowIndex) in loading ? [] : rows"
                    :key="row.resource?.id ?? 'unassigned'"
                    :row="row"
                    class="grid min-h-[calc(var(--row-lanes)*1.625rem+0.5rem)] grid-cols-[var(--label-width)_repeat(var(--day-count),minmax(var(--day-min),1fr))] border-b border-border last:border-b-0"
                >
                    <ResourceLabel
                        :row="row"
                        class="sticky left-0 z-20 flex min-w-0 flex-col justify-center border-r border-border bg-card px-3 py-1"
                    >
                        <slot
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
                            <span
                                :class="[
                                    'truncate text-xs whitespace-nowrap',
                                    row.busyDays
                                        ? 'text-muted-foreground'
                                        : 'text-green-700 dark:text-green-400',
                                ]"
                            >
                                {{ bookedSummary(row) }}
                                <span
                                    v-if="row.overlapDays"
                                    class="font-medium text-red-600 dark:text-red-400"
                                >
                                    · {{ row.overlapDays }} double-booked
                                </span>
                            </span>
                        </slot>
                    </ResourceLabel>

                    <ResourceCell
                        v-for="cell in row.cells"
                        :key="cell.date.toString()"
                        :cell="cell"
                        :row-index="rowIndex"
                        :resource-label="labelFor(row)"
                        :resource-id="row.resource?.id ?? null"
                        class="relative border-r border-border outline-none last:border-r-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-overlap:bg-red-500/8 data-selected:bg-primary/10 data-today:bg-primary/4 data-weekend:bg-muted/50"
                    >
                        <EventBar
                            v-for="segment in cell.segments"
                            :key="segment.event.id"
                            :segment="segment"
                            :resource-id="row.resource?.id ?? null"
                            :keyboard-axes="{
                                horizontal: 'day',
                                vertical: 'resource',
                                resourceOrder: rows.map(
                                    (candidate) => candidate.resource?.id ?? null,
                                ),
                            }"
                            class="absolute top-[calc(0.25rem+var(--event-lane)*1.625rem)] left-(--inset-start) z-10 h-6 w-[calc(var(--event-span)*100%+(var(--event-span)-1)*1px-var(--inset-start)-var(--inset-end))] rounded-sm [--inset-end:0.25rem] [--inset-start:0.25rem] data-continues-after:rounded-r-none data-continues-after:[--inset-end:-1px] data-continues-before:rounded-l-none data-continues-before:[--inset-start:0px] data-dragging:pointer-events-none data-dragging:z-30 data-dragging:shadow-lg data-editable:cursor-grab data-past:opacity-60"
                        >
                            <slot
                                name="event"
                                :event="sourceOf(segment.event)"
                                :segment="segment"
                                :resource="resourceOf(row)"
                            >
                                <div
                                    :tabindex="editable ? 0 : undefined"
                                    class="h-full truncate rounded-[inherit] bg-primary/10 px-1.5 text-xs leading-6 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset in-data-highlighted:bg-primary/20"
                                >
                                    {{ sourceOf(segment.event).title ?? segment.event.id }}
                                </div>
                            </slot>
                            <EventResizeHandle
                                v-if="!segment.continuesBefore"
                                edge="start"
                                class="absolute inset-y-0 left-0 z-10 w-1.5 cursor-ew-resize"
                            />
                            <EventResizeHandle
                                v-if="!segment.continuesAfter"
                                edge="end"
                                class="absolute inset-y-0 right-0 z-10 w-1.5 cursor-ew-resize"
                            />
                        </EventBar>
                    </ResourceCell>
                </ResourceRow>

                <template v-if="loading">
                    <div
                        v-for="(skeleton, skeletonIndex) in skeletonRows"
                        :key="skeletonIndex"
                        class="grid min-h-[calc(1.625rem+0.5rem)] grid-cols-[var(--label-width)_repeat(var(--day-count),minmax(var(--day-min),1fr))] border-b border-border last:border-b-0"
                        aria-hidden="true"
                    >
                        <div
                            class="sticky left-0 z-20 col-start-1 row-start-1 flex flex-col justify-center gap-1.5 border-r border-border bg-card px-3 py-2"
                        >
                            <span
                                :class="[
                                    'h-3.5 animate-pulse rounded-sm bg-muted motion-reduce:animate-none',
                                    skeleton.label,
                                ]"
                            />
                            <span
                                class="h-2.5 w-16 animate-pulse rounded-sm bg-muted motion-reduce:animate-none"
                            />
                        </div>
                        <div
                            v-for="(day, dayIndex) in days"
                            :key="day.date.toString()"
                            :style="{ gridColumn: dayIndex + 2 }"
                            :class="[
                                'row-start-1 border-r border-border last:border-r-0',
                                day.isWeekend && 'bg-muted/50',
                            ]"
                        />
                        <span
                            v-for="(bar, barIndex) in skeleton.bars"
                            :key="barIndex"
                            :style="{ gridColumn: skeletonColumn(bar, days.length) }"
                            class="row-start-1 mx-1 h-6 animate-pulse self-center rounded-sm bg-muted motion-reduce:animate-none"
                        />
                    </div>
                </template>
            </div>
        </ResourceGrid>
    </CalendarRoot>
</template>
