<script setup lang="ts">
import { ref } from 'vue';
import TimeGridCalendar from '@recipes/calendar/TimeGridCalendar.vue';
import DemoFrame from './DemoFrame.vue';
import DemoToggle from './DemoToggle.vue';
import { sampleEvents, useDemoState } from './sample';
import ViewSwitch from './ViewSwitch.vue';

const events = ref(sampleEvents());
const view = ref<'week' | 'day'>('week');
const editable = ref(true);
const selectable = ref(true);
const { status, onDrop, onResize, onSelect } = useDemoState(
    events,
    editable,
    'Drag an event, stretch its top or bottom edge, or click or drag across empty hours.',
);
</script>

<template>
    <DemoFrame :status="status">
        <template #options>
            <DemoToggle
                v-model="editable"
                label="editable"
            />
            <DemoToggle
                v-model="selectable"
                label="selectable"
            />
        </template>

        <TimeGridCalendar
            :view="view"
            :events="events"
            :editable="editable"
            :selectable="selectable"
            @event-drop="onDrop"
            @event-resize="onResize"
            @range-select="onSelect"
        >
            <template #toolbar>
                <ViewSwitch
                    v-model="view"
                    label="View"
                    :options="[
                        { value: 'week', label: 'Week' },
                        { value: 'day', label: 'Day' },
                    ]"
                />
            </template>
        </TimeGridCalendar>
    </DemoFrame>
</template>
