<script setup lang="ts" generic="T extends CalendarEventInput">
import { watch } from 'vue';
import {
    assertTemporal,
    localTimeZone,
    type CalendarEventInput,
    type CalendarResource,
    type CalendarView,
    type GanttLinkInput,
    type GanttScale,
    type ResourceId,
    type WeekDay,
} from '@calends/core';
import { Primitive, type PrimitiveProps } from './Primitive.js';
import { provideCalendarContext, useCalendar } from './useCalendar.js';
import type { EventDropDetail, RangeSelectDetail } from './useInteractions.js';

const props = withDefaults(
    defineProps<
        PrimitiveProps & {
            events?: readonly T[];
            view?: CalendarView;
            weekStartsOn?: WeekDay;
            timeZone?: string;
            locale?: string;
            fixedWeeks?: boolean;
            maxLanes?: number;
            today?: Temporal.PlainDate;
            /** Overrides the clock, for server rendering. Today follows it unless `today` is set. */
            now?: Temporal.ZonedDateTime;
            resources?: readonly CalendarResource[];
            getResourceIds?: (event: T) => readonly ResourceId[] | null | undefined;
            /** Adds a row for events whose resources aren't in `resources`. */
            unassigned?: boolean;
            slotMinMinutes?: number;
            slotMaxMinutes?: number;
            slotMinutes?: number;
            ganttScale?: GanttScale;
            ganttLinks?: readonly GanttLinkInput[];
            editable?: boolean;
            selectable?: boolean;
            snapMinutes?: number;
            canEdit?: (event: T) => boolean;
        }
    >(),
    { as: 'div', events: () => [], view: 'month', weekStartsOn: 7, fixedWeeks: false },
);

const emit = defineEmits<{
    'event-drop': [detail: EventDropDetail<T>];
    'event-resize': [detail: EventDropDetail<T>];
    'range-select': [detail: RangeSelectDetail];
}>();

// Vue hands a prop's default factory the other props, so the starting date can follow `today`.
// It runs before setup, so it checks for Temporal itself.
const date = defineModel<Temporal.PlainDate>('date', {
    default: (rawProps: Record<string, unknown>) => {
        assertTemporal();

        const { today, now, timeZone } = rawProps as {
            today?: Temporal.PlainDate;
            now?: Temporal.ZonedDateTime;
            timeZone?: string;
        };

        return (
            today ??
            now?.withTimeZone(timeZone ?? localTimeZone()).toPlainDate() ??
            Temporal.Now.plainDateISO(timeZone ?? localTimeZone())
        );
    },
});

const calendar = useCalendar<T>({
    date,
    events: () => props.events,
    view: () => props.view,
    weekStartsOn: () => props.weekStartsOn,
    timeZone: () => props.timeZone,
    locale: () => props.locale,
    fixedWeeks: () => props.fixedWeeks,
    maxLanes: () => props.maxLanes,
    today: () => props.today,
    now: () => props.now,
    resources: () => props.resources,
    getResourceIds: (event) => props.getResourceIds?.(event),
    unassigned: () => props.unassigned,
    slotMinMinutes: () => props.slotMinMinutes,
    slotMaxMinutes: () => props.slotMaxMinutes,
    slotMinutes: () => props.slotMinutes,
    ganttScale: () => props.ganttScale,
    ganttLinks: () => props.ganttLinks,
    editable: () => props.editable,
    selectable: () => props.selectable,
    snapMinutes: () => props.snapMinutes,
    canEdit: (event) => props.canEdit?.(event) ?? true,
    onEventDrop: (detail) => emit('event-drop', detail),
    onEventResize: (detail) => emit('event-resize', detail),
    onRangeSelect: (detail) => emit('range-select', detail),
});

watch(date, (value) => {
    const { start, end } = calendar.range.value;
    const focused = calendar.focusedDate.value;

    if (
        Temporal.PlainDate.compare(focused, start) < 0 ||
        Temporal.PlainDate.compare(focused, end) > 0
    ) {
        calendar.focusedDate.value = value;
    }
});

provideCalendarContext(calendar);

/** Keyboard move announcements; inline so the package needs no stylesheet. */
const visuallyHidden = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
} as const;
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        :data-view="calendar.view.value"
    >
        <slot
            :grid="calendar.grid.value"
            :date="date"
            :title="calendar.title.value"
            :visible-range="calendar.visibleRange.value"
            :prev="calendar.prev"
            :next="calendar.next"
            :go-to-today="calendar.goToToday"
        />
        <div
            v-if="!asChild"
            aria-live="polite"
            :style="visuallyHidden"
        >
            {{ calendar.announcement.value }}
        </div>
    </Primitive>
</template>
