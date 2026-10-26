<script setup lang="ts">
import { ref } from 'vue';
import MonthCalendar from '@recipes/MonthCalendar.vue';
import { sampleEvents, useDemoState } from './sample';

const events = ref(sampleEvents());
const editable = ref(true);
const selectable = ref(true);
const loading = ref(false);
const { status, onDrop, onResize, onSelect } = useDemoState(events, editable);
</script>

<template>
    <div class="calendar-demo vp-raw my-6 flex flex-col gap-3">
        <div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <label class="flex items-center gap-1.5">
                <input
                    v-model="editable"
                    type="checkbox"
                />
                editable
            </label>
            <label class="flex items-center gap-1.5">
                <input
                    v-model="selectable"
                    type="checkbox"
                />
                selectable
            </label>
            <label class="flex items-center gap-1.5">
                <input
                    v-model="loading"
                    type="checkbox"
                />
                loading
            </label>
        </div>

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

        <p
            class="text-sm text-muted-foreground"
            aria-live="polite"
        >
            {{ status }}
        </p>
    </div>
</template>
