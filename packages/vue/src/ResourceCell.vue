<script setup lang="ts">
import { computed } from 'vue';
import type { ResourceCell, ResourceId } from '@calends/core';
import { Primitive, type PrimitiveProps } from './Primitive.js';
import { injectCalendarContext } from './useCalendar.js';

const props = withDefaults(
    defineProps<
        PrimitiveProps & {
            cell: ResourceCell<any>;
            /** Index of the row, for keyboard focus. */
            rowIndex: number;
            /** The resource's name, for the cell's accessible label. */
            resourceLabel?: string;
            /** The row's resource, null for the unassigned row, so drops and selections know it. */
            resourceId?: ResourceId | null;
        }
    >(),
    { as: 'div' },
);

const calendar = injectCalendarContext('ResourceCell');

const day = computed(() => calendar.resourceGrid.value.days[props.cell.column]);

const isFocused = computed(
    () =>
        props.rowIndex === calendar.focusedRow.value &&
        props.cell.date.equals(calendar.focusedDate.value),
);

const label = computed(() => {
    const date = props.cell.date.toLocaleString(calendar.locale.value, { dateStyle: 'full' });
    const count = props.cell.eventCount;
    const events = count ? `${count} ${count === 1 ? 'event' : 'events'}` : 'free';

    return [props.resourceLabel, date, events].filter(Boolean).join(', ');
});

const isSelected = computed(() => {
    const range = calendar.selectedRange.value;

    return (
        range?.kind === 'day' &&
        range.resourceId === props.resourceId &&
        Temporal.PlainDate.compare(props.cell.date, range.startDate) >= 0 &&
        Temporal.PlainDate.compare(props.cell.date, range.endDate) <= 0
    );
});

function onFocus() {
    calendar.focusedRow.value = props.rowIndex;
    calendar.focusedDate.value = props.cell.date;
}
</script>

<template>
    <Primitive
        :as="as"
        :as-child="asChild"
        role="gridcell"
        :tabindex="isFocused ? 0 : -1"
        :aria-label="label"
        :data-date="cell.date.toString()"
        :data-row="rowIndex"
        :data-today="day?.isToday ? '' : undefined"
        :data-weekend="day?.isWeekend ? '' : undefined"
        :data-busy="cell.eventCount ? '' : undefined"
        :data-overlap="cell.hasOverlap ? '' : undefined"
        :data-focused="isFocused ? '' : undefined"
        :data-selected="isSelected ? '' : undefined"
        data-drop="day"
        :data-resource-id="resourceId === undefined ? undefined : String(resourceId ?? '')"
        @focus="onFocus"
    >
        <slot
            :cell="cell"
            :segments="cell.segments"
        />
    </Primitive>
</template>
