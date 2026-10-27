<script setup lang="ts">
import { computed, ref } from 'vue';
import CalendarSources from '@recipes/calendar/CalendarSources.vue';
import MonthCalendar from '@recipes/calendar/MonthCalendar.vue';
import DemoFrame from './DemoFrame.vue';
import { sampleEvents, useDemoState, type DemoEvent } from './sample';

const calendars = [
    { id: 'work', label: 'Work', color: 'var(--chart-1)' },
    { id: 'personal', label: 'Personal', color: 'var(--chart-2)' },
    { id: 'holidays', label: 'Holidays', color: 'var(--chart-3)' },
];

const sunday = Temporal.Now.plainDateISO().subtract({
    days: Temporal.Now.plainDateISO().dayOfWeek % 7,
});
const on = (day: number) => sunday.add({ days: day }).toString();
const at = (day: number, time: string) => `${on(day)}T${time}`;

const personal: DemoEvent[] = [
    { id: 'dentist', title: 'Dentist', start: at(2, '08:00'), end: at(2, '09:00') },
    { id: 'climbing', title: 'Climbing', start: at(4, '18:00'), end: at(4, '20:00') },
    { id: 'dinner', title: 'Dinner with Alex', start: at(6, '19:00'), end: at(6, '21:00') },
    { id: 'trip', title: 'Weekend away', start: on(13), end: on(14) },
];

const holidays: DemoEvent[] = [
    { id: 'founders', title: 'Founders Day', start: on(-5) },
    { id: 'harvest', title: 'Harvest Festival', start: on(12) },
];

// Two sources can reuse an id, so each id is prefixed with its calendar's.
const tagged = (calendar: string, items: DemoEvent[]) =>
    items.map((item) => ({ ...item, id: `${calendar}:${item.id}`, calendar }));

const events = ref([
    ...tagged('work', sampleEvents()),
    ...tagged('personal', personal),
    ...tagged('holidays', holidays),
]);
const hidden = ref<string[]>([]);
const colors = new Map(calendars.map((calendar) => [calendar.id, calendar.color]));

const visible = computed(() =>
    events.value
        .filter((item) => !hidden.value.includes(item.calendar!))
        .map((item) => ({ ...item, color: colors.get(item.calendar!) })),
);

const { status, onDrop, onResize } = useDemoState(
    events,
    ref(false),
    'Toggle a calendar to hide its events. Drag an event to move it.',
);
</script>

<template>
    <DemoFrame :status="status">
        <MonthCalendar
            :events="visible"
            editable
            :can-edit="(event) => event.calendar !== 'holidays'"
            :max-lanes="4"
            @event-drop="onDrop"
            @event-resize="onResize"
        >
            <template #toolbar>
                <CalendarSources
                    v-model:hidden="hidden"
                    :sources="calendars"
                />
            </template>
        </MonthCalendar>
    </DemoFrame>
</template>
