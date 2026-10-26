<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { ganttLinkArrow, roundedPath, routeGanttLink, type GanttLink } from '@calends/core';
import { injectCalendarContext } from './useCalendar.js';

/**
 * An SVG overlay of the links between rows. Lay it over the rows (absolute, the same box)
 * inside the scrolled content: it measures the rendered bars, so it follows any zoom, row
 * height, or drag preview. The slot draws each link from its `path` and `arrow`.
 */
const props = withDefaults(
    defineProps<{
        /** How far a line runs straight out of a bar and into the next, in pixels. */
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

        const fromRect = fromBar.getBoundingClientRect();
        const toRect = toBar.getBoundingClientRect();
        const rowRect = fromRow.getBoundingClientRect();
        const from = {
            x: fromRect.right - origin.left,
            y: fromRect.top + fromRect.height / 2 - origin.top,
        };
        const to = {
            x: toRect.left - origin.left,
            y: toRect.top + toRect.height / 2 - origin.top,
        };
        const gutterY = (to.y > from.y ? rowRect.bottom : rowRect.top) - origin.top;

        return [
            {
                link,
                path: roundedPath(
                    routeGanttLink(from, to, { gap: props.gap, gutterY }),
                    props.radius,
                ),
                arrow: ganttLinkArrow(to, props.arrowSize),
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
