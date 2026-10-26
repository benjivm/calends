<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import {
    ganttLinkArrow,
    roundedPath,
    routeGanttLink,
    type GanttLink,
    type GanttPoint,
} from '@calends/core';
import { injectCalendarContext } from './useCalendar.js';

/**
 * An SVG overlay of the links between rows. Lay it over the rows (absolute, the same box)
 * inside the scrolled content: it measures the rendered bars, so it follows any zoom, row
 * height, or drag preview. The slot draws each link from its `path` and `arrow`, and can end
 * its `link.label` at `labelPoint`: on the last leg, just before the arrow, in the successor's row.
 */
const props = withDefaults(
    defineProps<{
        /** How far in from a bar's ends a line may leave it, and how far it runs into the next, in pixels. */
        gap?: number;
        radius?: number;
        arrowSize?: number;
    }>(),
    { gap: 12, radius: 6, arrowSize: 5 },
);

const calendar = injectCalendarContext('GanttLinks');

const svg = ref<SVGSVGElement | null>(null);

interface MeasuredLink {
    link: GanttLink<any>;
    path: string;
    arrow: string;
    /** Where a right-aligned label ends. The last leg runs through open track, unlike legs that cross rows. */
    labelPoint: GanttPoint;
}

const measured = shallowRef<MeasuredLink[]>([]);

const find = (container: Element, attribute: string, id: string | number) =>
    container.querySelector(`[${attribute}="${CSS.escape(String(id))}"]`);

function measure() {
    const container = svg.value?.parentElement;

    if (!svg.value || !container) {
        return;
    }

    const origin = svg.value.getBoundingClientRect();

    measured.value = calendar.gantt.value.links.flatMap((link) => {
        const fromBar = find(container, 'data-event-id', link.from.event.id);
        const toBar = find(container, 'data-event-id', link.to.event.id);
        const fromRow = find(container, 'data-row-event-id', link.from.event.id);

        if (!fromBar || !toBar || !fromRow) {
            return [];
        }

        const box = (element: Element) => {
            const rect = element.getBoundingClientRect();

            return {
                left: rect.left - origin.left,
                right: rect.right - origin.left,
                top: rect.top - origin.top,
                bottom: rect.bottom - origin.top,
            };
        };
        const from = box(fromBar);
        const to = box(toBar);
        const row = box(fromRow);
        const gutterY = to.top > from.top ? row.bottom : row.top;
        const points = routeGanttLink(from, to, { gap: props.gap, gutterY });
        const end = points[points.length - 1];

        return [
            {
                link,
                path: roundedPath(points, props.radius),
                arrow: ganttLinkArrow(end, props.arrowSize),
                labelPoint: { x: end.x - props.arrowSize - 3, y: end.y },
            },
        ];
    });
}

let frame = 0;

const scheduleMeasure = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(measure);
};

let observer: ResizeObserver | undefined;

onMounted(() => {
    observer = new ResizeObserver(scheduleMeasure);

    if (svg.value?.parentElement) {
        observer.observe(svg.value.parentElement);
    }

    nextTick(scheduleMeasure);
});

onBeforeUnmount(() => {
    cancelAnimationFrame(frame);
    observer?.disconnect();
});

watch(calendar.gantt, () => nextTick(scheduleMeasure));

/** A highlighted bar lights its own links and dims the rest. */
const links = computed(() => {
    const highlighted = calendar.highlightedEventId.value;

    return measured.value.map((item) => {
        const touches =
            highlighted !== null &&
            (item.link.from.event.id === highlighted || item.link.to.event.id === highlighted);

        return { ...item, highlighted: touches, dimmed: highlighted !== null && !touches };
    });
});
</script>

<template>
    <svg
        ref="svg"
        aria-hidden="true"
    >
        <slot :links="links" />
    </svg>
</template>
