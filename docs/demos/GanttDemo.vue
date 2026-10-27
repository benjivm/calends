<script setup lang="ts">
import { ref } from 'vue';
import type { GanttScale } from '@calends/core';
import GanttCalendar from '@recipes/calendar/GanttCalendar.vue';
import DemoFrame from './DemoFrame.vue';
import DemoToggle from './DemoToggle.vue';
import { projectLinks, sampleProjects, useDemoState } from './sample';

const projects = ref(sampleProjects());
const scale = ref<GanttScale>('week');
const editable = ref(true);
const loading = ref(false);
const { status, onDrop, onResize } = useDemoState(
    projects,
    editable,
    'Drag a bar or stretch its edge. Hover a bar to light its links; "Billing API" overlaps "Web app rebuild", so that dependency is red.',
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
                v-model="loading"
                label="loading"
            />
        </template>

        <GanttCalendar
            v-model:scale="scale"
            :events="projects"
            :links="projectLinks"
            row-noun="projects"
            label-width="11rem"
            :editable="editable"
            :loading="loading"
            @event-drop="onDrop"
            @event-resize="onResize"
        />
    </DemoFrame>
</template>
