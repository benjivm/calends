<script lang="ts">
import type { CalendarEventInput } from '@calends/core';

export interface GanttCalendarEvent extends CalendarEventInput {
    title?: string;
}
</script>

<script setup lang="ts" generic="T extends GanttCalendarEvent">
import { nextTick, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue';
import type {
    CalendarEvent,
    GanttColumn,
    GanttLinkInput,
    GanttRow as GanttRowData,
    GanttScale,
    WeekDay,
} from '@calends/core';
import {
    CalendarRoot,
    EventResizeHandle,
    Gantt,
    GanttBar,
    GanttLinks,
    GanttRow,
    GanttToday,
    GanttTrack,
    type EventDropDetail,
} from '@calends/vue';

/**
 * One row per task across a continuous date axis, zoomable by day, week, or month. Rows keep the
 * order of `events`. The `label` slot fills the pinned left column; the `bar` slot renders inside
 * the positioned bar, which carries the state attributes for `in-data-*` styling, and gets
 * `fitsLabel(text)` to decide whether a name goes inside the bar or beside it. Pad the bar only
 * when the name fits: padding can't shrink, so on a bar narrower than it the content overflows and
 * covers the gap before a name placed beside it.
 */
const props = withDefaults(
    defineProps<{
        events?: readonly T[];
        /**
         * Lines between rows, by event id. A `dependency` (the default) runs from `from`'s end to
         * `to`'s start with an arrow, and turns red when `to` starts before `from` ends; a
         * `related` link is dashed with no arrow.
         */
        links?: readonly GanttLinkInput[];
        /** Names what a row is, for the header count: "12 projects". */
        rowNoun?: string;
        weekStartsOn?: WeekDay;
        timeZone?: string;
        locale?: string;
        labelWidth?: string;
        /**
         * Shows the Today button and zoom control above the chart. Turn it off to put them in a
         * page's own toolbar, driving `v-model:scale` and the exposed `scrollToToday`.
         */
        toolbar?: boolean;
        /** Hovering or focusing a row's label smoothly scrolls its bar into view. */
        scrollOnHover?: boolean;
        rowHeight?: string;
        barHeight?: string;
        /** Lets bars be moved and resized by days; listen for `event-drop` and `event-resize`. */
        editable?: boolean;
        canEdit?: (event: T) => boolean;
        /** Swaps the rows for placeholders while the events load; the axis and zoom stay usable. */
        loading?: boolean;
    }>(),
    {
        events: () => [],
        links: () => [],
        rowNoun: 'tasks',
        weekStartsOn: 7,
        labelWidth: '16rem',
        toolbar: true,
        rowHeight: '2.75rem',
        barHeight: '1.75rem',
    },
);

const emit = defineEmits<{
    'event-drop': [detail: EventDropDetail<T>];
    'event-resize': [detail: EventDropDetail<T>];
}>();

defineSlots<{
    toolbar?(): unknown;
    'label-heading'?(props: { count: number }): unknown;
    label?(props: { event: T; row: GanttRowData }): unknown;
    bar?(props: { event: T; row: GanttRowData; fitsLabel: (text: string) => boolean }): unknown;
}>();

const scale = defineModel<GanttScale>('scale', { default: 'week' });

const scales: { value: GanttScale; label: string }[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
];

/** Rem per day at each zoom; keep in step with `dayWidths` below. */
const dayWidthRem: Record<GanttScale, number> = { day: 2.5, week: 1, month: 0.25 };

const dayWidths: Record<GanttScale, string> = {
    day: '[--day-width:2.5rem]',
    week: '[--day-width:1rem]',
    month: '[--day-width:0.25rem]',
};

/** Inside the views the event type is erased, so the recipe restores its own. */
const sourceOf = (event: CalendarEvent) => event.source as T;
const titleOf = (row: GanttRowData) => sourceOf(row.event).title ?? String(row.event.id);

/**
 * Whether `text` fits inside the row's bar at the current zoom, estimated at text-xs (about 6.5px a
 * character) with the bar's padding; when it doesn't, the label goes beside the bar.
 */
const fitsLabel = (row: GanttRowData, text: string) =>
    (row.endOffset - row.startOffset) * dayWidthRem[scale.value] * 16 >= text.length * 6.5 + 20;

const scroller = useTemplateRef('scroller');

/** Scrolls so `date` sits a third of the way into the visible track. */
function scrollToDate(date: Temporal.PlainDate | string) {
    const container = scroller.value;
    const axis = container?.querySelector<HTMLElement>('[data-gantt-axis]');

    if (!container || !axis) return;

    const start = Temporal.PlainDate.from(axis.dataset.axisStart!);
    const fraction =
        start.until(Temporal.PlainDate.from(date)).days / Number(axis.dataset.axisDays);
    const label = container.querySelector<HTMLElement>('[data-label-column]')?.offsetWidth ?? 0;
    const visibleTrack = container.clientWidth - label;

    container.scrollLeft = Math.max(axis.offsetWidth * fraction - visibleTrack / 3, 0);
}

const scrollToToday = () => scrollToDate(Temporal.Now.plainDateISO());

onMounted(scrollToToday);

watch(scale, () => nextTick(scrollToToday));

/** The axis refits to the loaded events, which moves today. */
watch(
    () => props.loading,
    (loading) => !loading && nextTick(scrollToToday),
);

/** How far past the label column a revealed bar's start lands, in rem. */
const revealInsetRem = 3;

/** Scrolls so a row's bar starts a fixed distance past the label column, so every row lines up. */
function scrollRowIntoView(row: GanttRowData) {
    const container = scroller.value;
    const axis = container?.querySelector<HTMLElement>('[data-gantt-axis]');

    if (!container || !axis) return;

    const dayWidth = axis.offsetWidth / Number(axis.dataset.axisDays);
    const inset = revealInsetRem * parseFloat(getComputedStyle(document.documentElement).fontSize);
    const left = Math.max(row.startOffset * dayWidth - inset, 0);

    if (Math.abs(container.scrollLeft - left) < 1) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    container.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
}

let revealTimer: ReturnType<typeof setTimeout> | undefined;

/** A short hover intent, so sweeping the pointer down the list doesn't chain scrolls. */
function revealRow(row: GanttRowData) {
    if (!props.scrollOnHover) return;

    clearTimeout(revealTimer);
    revealTimer = setTimeout(() => scrollRowIntoView(row), 150);
}

const cancelReveal = () => clearTimeout(revealTimer);

onBeforeUnmount(cancelReveal);

defineExpose({ scrollToDate, scrollToToday, scrollRowIntoView });

/** Placeholder rows: a label width and a bar as `[start, length]` fractions of the axis. */
const skeletonRows = [
    { label: 'w-40', bar: [0.08, 0.3] },
    { label: 'w-32', bar: [0.18, 0.42] },
    { label: 'w-48', bar: [0.3, 0.22] },
    { label: 'w-36', bar: [0.36, 0.38] },
    { label: 'w-44', bar: [0.5, 0.26] },
];

const groupLabel = (group: GanttColumn) =>
    scale.value === 'month'
        ? String(group.start.year)
        : group.start.toLocaleString(props.locale, { month: 'long', year: 'numeric' });

function columnLabel(column: GanttColumn) {
    if (scale.value === 'day') return String(column.start.day);
    if (scale.value === 'week') {
        return column.start.toLocaleString(props.locale, { month: 'short', day: 'numeric' });
    }

    return column.start.toLocaleString(props.locale, { month: 'short' });
}
</script>

<template>
    <CalendarRoot
        :events="events"
        :gantt-scale="scale"
        :gantt-links="links"
        :week-starts-on="weekStartsOn"
        :time-zone="timeZone"
        :locale="locale"
        :editable="editable"
        :can-edit="canEdit"
        class="flex flex-col gap-3"
        @event-drop="emit('event-drop', $event)"
        @event-resize="emit('event-resize', $event)"
    >
        <div
            v-if="toolbar"
            class="flex flex-wrap items-center justify-between gap-3"
        >
            <div class="flex items-center gap-3">
                <button
                    type="button"
                    class="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-sm font-medium shadow-xs outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    @click="scrollToToday"
                >
                    Today
                </button>

                <div
                    role="group"
                    aria-label="Zoom"
                    class="inline-flex h-8 items-center rounded-md bg-muted p-0.5 text-sm"
                >
                    <button
                        v-for="option in scales"
                        :key="option.value"
                        type="button"
                        :aria-pressed="scale === option.value"
                        class="h-7 rounded-sm px-2.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs"
                        @click="scale = option.value"
                    >
                        {{ option.label }}
                    </button>
                </div>
            </div>

            <slot name="toolbar" />
        </div>

        <Gantt
            v-slot="{ gantt, rows, columns, groups }"
            :aria-busy="loading || undefined"
            :class="[
                'overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xs',
                dayWidths[scale],
            ]"
            :style="{
                '--label-width': labelWidth,
                '--row-height': rowHeight,
                '--bar-height': barHeight,
            }"
        >
            <div
                ref="scroller"
                class="overflow-x-auto"
            >
                <div
                    class="relative min-w-[calc(var(--label-width)+var(--axis-days)*var(--day-width))]"
                >
                    <div
                        class="grid grid-cols-[var(--label-width)_minmax(0,1fr)] border-b border-border bg-muted"
                    >
                        <div
                            data-label-column
                            class="sticky left-0 z-20 flex items-end border-r border-border bg-muted px-3 py-1.5 text-sm font-semibold text-foreground shadow-[6px_0_8px_-6px_rgb(0_0_0/0.12)]"
                        >
                            <span
                                v-if="loading"
                                class="h-4 w-24 animate-pulse rounded-sm bg-accent motion-reduce:animate-none"
                                aria-hidden="true"
                            />
                            <slot
                                v-else
                                name="label-heading"
                                :count="rows.length"
                            >
                                {{ rows.length }} {{ rowNoun }}
                            </slot>
                        </div>

                        <div
                            data-gantt-axis
                            :data-axis-start="gantt.start.toString()"
                            :data-axis-days="gantt.axisDays"
                            class="relative h-12"
                        >
                            <div class="relative h-6 border-b border-border">
                                <div
                                    v-for="group in groups"
                                    :key="group.start.toString()"
                                    class="absolute inset-y-0 left-[calc(var(--offset)/var(--axis-days)*100%)] flex w-[calc(var(--days)/var(--axis-days)*100%)] items-center border-l border-border text-xs font-medium whitespace-nowrap text-foreground/80 first:border-l-0"
                                    :style="{ '--offset': group.offset, '--days': group.days }"
                                >
                                    <!-- Pinned beside the name column while its span is in view. -->
                                    <span
                                        class="sticky left-[calc(var(--label-width)+0.5rem)] px-2"
                                    >
                                        {{ groupLabel(group) }}
                                    </span>
                                </div>
                            </div>
                            <div class="relative h-6">
                                <div
                                    v-for="column in columns"
                                    :key="column.start.toString()"
                                    :data-today="column.isToday ? '' : undefined"
                                    :data-weekend="column.isWeekend ? '' : undefined"
                                    class="absolute inset-y-0 left-[calc(var(--offset)/var(--axis-days)*100%)] flex w-[calc(var(--days)/var(--axis-days)*100%)] items-center justify-center overflow-hidden border-l border-border text-xs whitespace-nowrap text-muted-foreground first:border-l-0 data-today:font-semibold data-today:text-primary"
                                    :style="{ '--offset': column.offset, '--days': column.days }"
                                >
                                    {{ columnLabel(column) }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="relative">
                        <div
                            class="pointer-events-none absolute inset-y-0 right-0 left-(--label-width)"
                        >
                            <div
                                v-for="column in columns"
                                :key="column.start.toString()"
                                :data-weekend="column.isWeekend ? '' : undefined"
                                class="absolute inset-y-0 left-[calc(var(--offset)/var(--axis-days)*100%)] w-[calc(var(--days)/var(--axis-days)*100%)] border-l border-border/60 first:border-l-0 data-weekend:bg-muted/50"
                                :style="{ '--offset': column.offset, '--days': column.days }"
                            />
                            <GanttToday
                                class="absolute inset-y-0 left-[calc((var(--today)+0.5)/var(--axis-days)*100%)] z-15 w-0.5 bg-red-500"
                            />
                        </div>

                        <GanttRow
                            v-for="row in loading ? [] : rows"
                            :key="row.event.id"
                            :row="row"
                            class="group/row grid min-h-(--row-height) grid-cols-[var(--label-width)_minmax(0,1fr)] border-b border-border last:border-b-0 hover:bg-muted/40"
                        >
                            <div
                                class="sticky left-0 z-20 flex min-w-0 items-center border-r border-border bg-card shadow-[6px_0_8px_-6px_rgb(0_0_0/0.12)] group-hover/row:bg-muted"
                                @pointerenter="revealRow(row)"
                                @pointerleave="cancelReveal"
                                @focusin="revealRow(row)"
                            >
                                <slot
                                    name="label"
                                    :event="sourceOf(row.event)"
                                    :row="row"
                                >
                                    <span class="truncate px-3 text-sm font-medium text-foreground">
                                        {{ titleOf(row) }}
                                    </span>
                                </slot>
                            </div>

                            <GanttTrack class="relative">
                                <GanttBar
                                    :row="row"
                                    class="absolute top-1/2 left-[calc(var(--bar-start)/var(--axis-days)*100%)] z-10 h-(--bar-height) w-[max(calc((var(--bar-end)-var(--bar-start))/var(--axis-days)*100%),0.5rem)] -translate-y-1/2 rounded-md data-continues-after:rounded-r-none data-continues-before:rounded-l-none data-dragging:pointer-events-none data-dragging:z-30 data-dragging:shadow-lg data-editable:cursor-grab"
                                >
                                    <slot
                                        name="bar"
                                        :event="sourceOf(row.event)"
                                        :row="row"
                                        :fits-label="(text: string) => fitsLabel(row, text)"
                                    >
                                        <div
                                            :tabindex="editable ? 0 : undefined"
                                            :aria-label="titleOf(row)"
                                            :class="{ 'px-2': fitsLabel(row, titleOf(row)) }"
                                            class="flex h-full items-center truncate rounded-[inherit] bg-primary/10 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset in-data-highlighted:bg-primary/20"
                                        >
                                            <template v-if="fitsLabel(row, titleOf(row))">
                                                {{ titleOf(row) }}
                                            </template>
                                        </div>
                                        <span
                                            v-if="!fitsLabel(row, titleOf(row))"
                                            aria-hidden="true"
                                            class="pointer-events-none absolute top-1/2 left-full ml-2 -translate-y-1/2 text-xs font-medium whitespace-nowrap text-foreground/80"
                                        >
                                            {{ titleOf(row) }}
                                        </span>
                                    </slot>
                                    <EventResizeHandle
                                        v-if="!row.continuesBefore"
                                        edge="start"
                                        class="absolute inset-y-0 left-0 z-10 w-1.5 cursor-ew-resize"
                                    />
                                    <EventResizeHandle
                                        v-if="!row.continuesAfter"
                                        edge="end"
                                        class="absolute inset-y-0 right-0 z-10 w-1.5 cursor-ew-resize"
                                    />
                                </GanttBar>
                            </GanttTrack>
                        </GanttRow>

                        <!-- Above the row tints, below the bars (z-10) and the pinned labels (z-20). -->
                        <GanttLinks
                            v-if="!loading && links.length"
                            v-slot="{ links: drawn }"
                            class="pointer-events-none absolute inset-0 z-5 size-full overflow-visible"
                        >
                            <g
                                v-for="item in drawn"
                                :key="item.link.id"
                                :data-kind="item.link.kind"
                                :data-conflict="item.link.conflict ? '' : undefined"
                                :data-highlighted="item.highlighted ? '' : undefined"
                                :data-dimmed="item.dimmed ? '' : undefined"
                                class="group/link text-muted-foreground transition-opacity data-conflict:text-red-500 data-dimmed:opacity-25 motion-reduce:transition-none dark:data-conflict:text-red-400 [&[data-highlighted]:not([data-conflict])]:text-primary"
                            >
                                <path
                                    :d="item.path"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-linejoin="round"
                                    class="stroke-[1.5] group-data-highlighted/link:stroke-2 group-data-[kind=related]/link:[stroke-dasharray:4_3]"
                                />
                                <path
                                    v-if="item.link.kind === 'dependency'"
                                    :d="item.arrow"
                                    fill="currentColor"
                                />
                            </g>
                        </GanttLinks>

                        <template v-if="loading">
                            <div
                                v-for="(skeleton, skeletonIndex) in skeletonRows"
                                :key="skeletonIndex"
                                class="grid min-h-(--row-height) grid-cols-[var(--label-width)_minmax(0,1fr)] border-b border-border last:border-b-0"
                                aria-hidden="true"
                            >
                                <div
                                    class="sticky left-0 z-20 flex min-w-0 flex-col justify-center gap-2 border-r border-border bg-card px-3 shadow-[6px_0_8px_-6px_rgb(0_0_0/0.12)]"
                                >
                                    <span
                                        :class="[
                                            'h-3.5 animate-pulse rounded-sm bg-muted motion-reduce:animate-none',
                                            skeleton.label,
                                        ]"
                                    />
                                    <span
                                        class="h-2.5 w-20 animate-pulse rounded-sm bg-muted motion-reduce:animate-none"
                                    />
                                </div>

                                <div class="relative">
                                    <span
                                        class="absolute top-1/2 left-[calc(var(--start)*100%)] z-10 h-(--bar-height) w-[calc(var(--length)*100%)] -translate-y-1/2 animate-pulse rounded-md bg-muted motion-reduce:animate-none"
                                        :style="{
                                            '--start': skeleton.bar[0],
                                            '--length': skeleton.bar[1],
                                        }"
                                    />
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </Gantt>
    </CalendarRoot>
</template>
