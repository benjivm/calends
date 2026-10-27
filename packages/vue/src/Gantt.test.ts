import { nextTick } from 'vue';
import { roundedPath, routeGanttLink } from '@calends/core';
import { enableAutoUnmount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    date,
    eventElement,
    installPointerStub,
    layOut,
    mountGantt,
    pointer,
    pointerOver,
    pressOnWindow,
    type CalendarWrapper,
    type TestEvent,
} from './test-harness.js';
import type { EventDropDetail, RangeSelectDetail } from './useInteractions.js';

/**
 * Fitted to a week scale, the axis pads two weeks either side and snaps to whole weeks:
 * Sunday Sep 27 to Saturday Nov 7, 42 days.
 */
const TASKS: TestEvent[] = [
    { id: 'design', title: 'Design', start: '2026-10-14', end: '2026-10-16' },
    { id: 'build', title: 'Build', start: '2026-10-19', end: '2026-10-23' },
    { id: 'test', title: 'Test', start: '2026-10-21', end: '2026-10-23' },
];

const LINKS = [
    { id: 'design-build', from: 'design', to: 'build' },
    { id: 'build-test', from: 'build', to: 'test', kind: 'related' },
];

const style = (element: Element, name: string) =>
    (element as HTMLElement).style.getPropertyValue(name);

const root = (wrapper: CalendarWrapper) => wrapper.get('[data-scale]').element;
const tracks = (wrapper: CalendarWrapper) =>
    wrapper.findAll<HTMLElement>('[data-drop="dayaxis"]').map((track) => track.element);
const today = (wrapper: CalendarWrapper) =>
    wrapper.find('[data-testid="rows"] > [aria-hidden="true"]:not(svg)');

enableAutoUnmount(afterEach);

describe('Gantt layout', () => {
    it('fits the axis to the tasks and exposes its length', () => {
        const wrapper = mountGantt({ events: TASKS });
        const track = tracks(wrapper)[0];

        expect(root(wrapper).getAttribute('data-scale')).toBe('week');
        expect(style(root(wrapper), '--axis-days')).toBe('42');
        expect(track.dataset.axisStart).toBe('2026-09-27');
        expect(track.dataset.axisDays).toBe('42');
    });

    it('places each bar in days from the axis start, and as a percentage of the axis', () => {
        const wrapper = mountGantt({ events: TASKS });
        const design = eventElement(wrapper, 'design');

        expect(style(design, '--bar-start')).toBe('17');
        expect(style(design, '--bar-end')).toBe('20');
        expect(style(design, '--bar-offset')).toBe(`${(17 / 42) * 100}%`);
        expect(style(design, '--bar-length')).toBe(`${(3 / 42) * 100}%`);
    });

    it('draws one row per task, in the order given, tagged with its event', () => {
        const wrapper = mountGantt({ events: [...TASKS].reverse() });

        expect(
            wrapper
                .findAll('[data-row-event-id]')
                .map((row) => row.attributes('data-row-event-id')),
        ).toEqual(['test', 'build', 'design']);
    });

    it('follows the scale', () => {
        const wrapper = mountGantt({ events: TASKS, ganttScale: 'day' });

        expect(root(wrapper).getAttribute('data-scale')).toBe('day');
        // A week of padding either side: Oct 7 to Oct 30.
        expect(tracks(wrapper)[0].dataset.axisStart).toBe('2026-10-07');
        expect(style(root(wrapper), '--axis-days')).toBe('24');
    });
});

describe('GanttToday', () => {
    it('marks today as one day on the axis', () => {
        const wrapper = mountGantt({ events: TASKS });
        const line = today(wrapper).element;

        expect(style(line, '--today')).toBe('17');
        expect(style(line, '--today-offset')).toBe(`${(17 / 42) * 100}%`);
        expect(style(line, '--today-length')).toBe(`${(1 / 42) * 100}%`);
    });

    it('renders nothing when today is off the axis', () => {
        const wrapper = mountGantt({ events: TASKS, today: date('2027-01-04') });

        expect(today(wrapper).exists()).toBe(false);
    });
});

describe('GanttLinks', () => {
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    /** The SVG's box starts at (100, 50); bars are 10px a day and rows 40px tall below it. */
    const ORIGIN = { left: 100, top: 50 };

    function barBox(bar: HTMLElement, rowIndex: number) {
        return {
            left: Number(style(bar, '--bar-start')) * 10,
            right: Number(style(bar, '--bar-end')) * 10,
            top: rowIndex * 40 + 10,
            bottom: rowIndex * 40 + 30,
        };
    }

    /** Reads the bar's variables on each call, so a re-render moves its box. */
    function layOutGantt(wrapper: CalendarWrapper) {
        layOut(wrapper.get('svg').element, { ...ORIGIN, width: 420, height: 120 });

        wrapper.findAll<HTMLElement>('[data-row-event-id]').forEach((row, index) => {
            layOut(row.element, {
                left: ORIGIN.left,
                top: ORIGIN.top + index * 40,
                width: 420,
                height: 40,
            });

            const bar = row.get<HTMLElement>('[data-event-id]').element;

            bar.getBoundingClientRect = () => {
                const box = barBox(bar, index);

                return {
                    left: ORIGIN.left + box.left,
                    right: ORIGIN.left + box.right,
                    top: ORIGIN.top + box.top,
                    bottom: ORIGIN.top + box.bottom,
                } as DOMRect;
            };
        });
    }

    async function mountLinked(props: Record<string, unknown> = {}) {
        const wrapper = mountGantt({ events: TASKS, ganttLinks: LINKS, ...props });

        layOutGantt(wrapper);
        await nextTick();
        await frame();

        return wrapper;
    }

    const path = (wrapper: CalendarWrapper, id: string) =>
        wrapper.get(`[data-link-id="${id}"]`).attributes('d');

    /** The route between two rows' bars, in the SVG's own coordinates. */
    function expectedPath(wrapper: CalendarWrapper, fromIndex: number, toIndex: number) {
        const bars = wrapper.findAll<HTMLElement>('[data-event-id]').map((bar) => bar.element);
        const from = barBox(bars[fromIndex], fromIndex);
        const to = barBox(bars[toIndex], toIndex);
        const gutterY = to.top > from.top ? (fromIndex + 1) * 40 : fromIndex * 40;

        return roundedPath(routeGanttLink(from, to, { gap: 12, gutterY }), 6);
    }

    it('routes each link between the rendered bars, measured from the overlay', async () => {
        const wrapper = await mountLinked();

        expect(wrapper.findAll('[data-link-id]')).toHaveLength(2);
        expect(path(wrapper, 'design-build')).toBe(expectedPath(wrapper, 0, 1));
        expect(path(wrapper, 'build-test')).toBe(expectedPath(wrapper, 1, 2));
    });

    it('measures again when the tasks change', async () => {
        const wrapper = await mountLinked();
        const before = path(wrapper, 'design-build');

        await wrapper.setProps({
            events: TASKS.map((task) =>
                task.id === 'build' ? { ...task, start: '2026-10-20', end: '2026-10-24' } : task,
            ),
        });
        await nextTick();
        await frame();

        expect(path(wrapper, 'design-build')).not.toBe(before);
        expect(path(wrapper, 'design-build')).toBe(expectedPath(wrapper, 0, 1));
    });

    it('draws nothing for a link whose bar is not rendered', async () => {
        const wrapper = await mountLinked({
            ganttLinks: [...LINKS, { id: 'design-ghost', from: 'design', to: 'ghost' }],
        });

        expect(
            wrapper.findAll('[data-link-id]').map((link) => link.attributes('data-link-id')),
        ).toEqual(['design-build', 'build-test']);
    });

    it('lights a hovered bar’s links and dims the rest', async () => {
        const wrapper = await mountLinked();
        const link = (id: string) => wrapper.get(`[data-link-id="${id}"]`);

        expect(link('design-build').attributes('data-dimmed')).toBeUndefined();

        await wrapper.get('[data-event-id="design"]').trigger('pointerenter');

        expect(link('design-build').attributes('data-highlighted')).toBe('');
        expect(link('build-test').attributes('data-dimmed')).toBe('');

        await wrapper.get('[data-event-id="design"]').trigger('pointerleave');

        expect(link('design-build').attributes('data-highlighted')).toBeUndefined();
        expect(link('build-test').attributes('data-dimmed')).toBeUndefined();
    });
});

describe('Gantt interactions', () => {
    beforeEach(installPointerStub);

    const drops = (wrapper: CalendarWrapper) =>
        (wrapper.emitted('event-drop') ?? []).map(
            ([detail]) => detail as EventDropDetail<TestEvent>,
        );
    const resizes = (wrapper: CalendarWrapper) =>
        (wrapper.emitted('event-resize') ?? []).map(
            ([detail]) => detail as EventDropDetail<TestEvent>,
        );
    const selections = (wrapper: CalendarWrapper) =>
        (wrapper.emitted('range-select') ?? []).map(([detail]) => detail as RangeSelectDetail);

    /** Ten pixels a day, each track 40px below the last. */
    function mountEditable(props: Record<string, unknown> = {}) {
        const wrapper = mountGantt({ events: TASKS, editable: true, selectable: true, ...props });

        tracks(wrapper).forEach((track, index) =>
            layOut(track, { top: index * 40, width: 420, height: 40 }),
        );

        return wrapper;
    }

    async function press(grab: Element, track: HTMLElement, fromX: number, toX: number) {
        pointerOver(grab, track);
        grab.dispatchEvent(pointer('pointerdown', { clientX: fromX, clientY: 20 }));
        pointerOver(track);
        window.dispatchEvent(pointer('pointermove', { clientX: toX, clientY: 20 }));
        await nextTick();
    }

    const release = async () => {
        window.dispatchEvent(pointer('pointerup'));
        await nextTick();
    };

    it('moves a bar by the days the pointer crosses, keeping the axis still', async () => {
        const wrapper = mountEditable();

        await press(eventElement(wrapper, 'design'), tracks(wrapper)[0], 175, 405);
        expect(style(eventElement(wrapper, 'design'), '--bar-start')).toBe('40');
        expect(style(root(wrapper), '--axis-days')).toBe('42');

        await release();

        expect(drops(wrapper)).toHaveLength(1);
        expect(drops(wrapper)[0].start.toString()).toBe('2026-11-06');
        expect(drops(wrapper)[0].end.toString()).toBe('2026-11-08');
        expect(drops(wrapper)[0].allDay).toBe(true);
    });

    it('resizes from the end handle', async () => {
        const wrapper = mountEditable();
        const handle = eventElement(wrapper, 'design').querySelector('[data-edge="end"]')!;

        await press(handle, tracks(wrapper)[0], 195, 215);
        await release();

        expect(resizes(wrapper)).toHaveLength(1);
        expect(resizes(wrapper)[0].start.toString()).toBe('2026-10-14');
        expect(resizes(wrapper)[0].end.toString()).toBe('2026-10-18');
    });

    it('moves a day at a time with Left and Right, and ignores Up and Down', async () => {
        const wrapper = mountEditable();
        const button = eventElement(wrapper, 'design').querySelector('button')!;

        button.focus();
        button.dispatchEvent(
            new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
        );
        await nextTick();
        await pressOnWindow('ArrowRight');
        await pressOnWindow('ArrowDown');
        expect(style(eventElement(wrapper, 'design'), '--bar-start')).toBe('18');

        await pressOnWindow(' ');

        expect(drops(wrapper)[0].start.toString()).toBe('2026-10-15');
        expect(drops(wrapper)[0].resourceId).toBeUndefined();
    });

    it('selects whole days along a track', async () => {
        const wrapper = mountEditable();
        const [track] = tracks(wrapper);

        pointerOver(track);
        track.dispatchEvent(pointer('pointerdown', { clientX: 15, clientY: 20 }));
        window.dispatchEvent(pointer('pointermove', { clientX: 45, clientY: 20 }));
        await nextTick();
        await release();

        expect(selections(wrapper)).toHaveLength(1);
        expect(selections(wrapper)[0].start.toString()).toBe('2026-09-28');
        expect(selections(wrapper)[0].end.toString()).toBe('2026-10-01');
        expect(selections(wrapper)[0].allDay).toBe(true);
    });
});
