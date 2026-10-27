<script setup lang="ts">
import { ref } from 'vue';
import ResourceCalendar from '@recipes/calendar/ResourceCalendar.vue';
import DemoFrame from './DemoFrame.vue';
import DemoToggle from './DemoToggle.vue';
import { sampleJobs, technicians, useDemoState, type DemoEvent } from './sample';
import ViewSwitch from './ViewSwitch.vue';

const jobs = ref(sampleJobs());
const period = ref<'week' | 'month'>('week');
const editable = ref(true);
const selectable = ref(true);
const loading = ref(false);
const { status, onDrop, onResize, onSelect } = useDemoState(
    jobs,
    editable,
    'Drag a job across days or to another technician, or click or drag across empty days.',
);

const techsOf = (job: DemoEvent) => job.techs;
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

        <ResourceCalendar
            :period="period"
            :events="jobs"
            :resources="technicians"
            :get-resource-ids="techsOf"
            resource-heading="Technician"
            unassigned-label="Unassigned"
            :editable="editable"
            :selectable="selectable"
            :loading="loading"
            @event-drop="onDrop"
            @event-resize="onResize"
            @range-select="onSelect"
        >
            <template #toolbar>
                <ViewSwitch
                    v-model="period"
                    label="Period"
                    :options="[
                        { value: 'week', label: 'Week' },
                        { value: 'month', label: 'Month' },
                    ]"
                />
            </template>
        </ResourceCalendar>
    </DemoFrame>
</template>
