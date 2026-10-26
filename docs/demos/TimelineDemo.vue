<script setup lang="ts">
import { ref } from 'vue';
import TimelineCalendar from '@recipes/TimelineCalendar.vue';
import DemoFrame from './DemoFrame.vue';
import DemoToggle from './DemoToggle.vue';
import { sampleJobs, technicians, useDemoState, type DemoEvent } from './sample';
import ViewSwitch from './ViewSwitch.vue';

const jobs = ref(sampleJobs());
const view = ref<'day' | 'week'>('day');
const editable = ref(true);
const selectable = ref(true);
const { status, onDrop, onResize, onSelect } = useDemoState(
    jobs,
    editable,
    'Drag a job along the hours or to another technician, or click or drag across an empty row.',
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
        </template>

        <TimelineCalendar
            :view="view"
            :events="jobs"
            :resources="technicians"
            :get-resource-ids="techsOf"
            resource-heading="Technician"
            unassigned-label="Unassigned"
            :start-hour="6"
            :end-hour="22"
            :scroll-to-hour="6"
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
                        { value: 'day', label: 'Day' },
                        { value: 'week', label: 'Week' },
                    ]"
                />
            </template>
        </TimelineCalendar>
    </DemoFrame>
</template>
