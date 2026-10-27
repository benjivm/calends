<script setup lang="ts">
import { ref } from 'vue';
import MonthCalendar from '@recipes/calendar/MonthCalendar.vue';
import DemoFrame from './DemoFrame.vue';
import DemoToggle from './DemoToggle.vue';
import { sampleEvents, useDemoState } from './sample';

const events = ref(sampleEvents());
const editable = ref(true);
const selectable = ref(true);
const loading = ref(false);
const { status, onDrop, onResize, onSelect } = useDemoState(
    events,
    editable,
    'Drag an event, stretch its edge, or click or drag across empty days.',
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
            <DemoToggle
                v-model="loading"
                label="loading"
            />
        </template>

        <MonthCalendar
            :events="events"
            :editable="editable"
            :selectable="selectable"
            :loading="loading"
            :max-lanes="4"
            @event-drop="onDrop"
            @event-resize="onResize"
            @range-select="onSelect"
        />
    </DemoFrame>
</template>
