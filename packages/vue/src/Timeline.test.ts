import { nextTick } from 'vue';
import { periodTitle } from '@calends/core';
import { enableAutoUnmount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    eventElement,
    installPointerStub,
    layOut,
    mountTimeline,
    pointer,
    pointerOver,
    pressOnWindow,
    RESOURCES,
    TODAY,
    type CalendarWrapper,
    type TestEvent,
} from './test-harness.js';
import type { EventDropDetail, RangeSelectDetail } from './useInteractions.js';

/** 8:00 to 18:00, so each day contributes a 600-minute window to the axis. */
const HOURS = { slotMinMinutes: 8 * 60, slotMaxMinutes: 18 * 60 };

const EVENTS: TestEvent[] = [
    { id: 'install', title: 'Install', start: '2026-10-14T09:00', end: '2026-10-14T10:30' },
    { id: 'repair', title: 'Repair', start: '2026-10-14T10:00', end: '2026-10-14T11:00' },
    { id: 'survey', title: 'Survey', start: '2026-10-14T13:00', end: '2026-10-14T14:00' },
];

const ASSIGNED: TestEvent[] = [
    {
        id: 'install',
        title: 'Install',
        start: '2026-10-14T09:00',
        end: '2026-10-14T10:00',
        resourceIds: ['ana'],
    },
];

const style = (element: Element, name: string) =>
    (element as HTMLElement).style.getPropertyValue(name);

const tracks = (wrapper: CalendarWrapper) =>
    wrapper.findAll<HTMLElement>('[data-drop="axis"]').map((track) => track.element);
const now = (value: string) => Temporal.ZonedDateTime.from(`${value}[America/Chicago]`);

/** Wall-clock text, so assertions don't depend on the zone's offset formatting. */
const wall = (value: Temporal.PlainDate | Temporal.ZonedDateTime) =>
    value instanceof Temporal.ZonedDateTime ? value.toPlainDateTime().toString() : value.toString();

enableAutoUnmount(afterEach);

describe('Timeline layout', () => {
    it('exposes the axis, window, and slots as variables, and labels itself with the period', () => {
        const wrapper = mountTimeline({ view: 'week', slotMinutes: 30, ...HOURS });
        const root = wrapper.get('[role="group"]').element;

        expect(root.getAttribute('aria-label')).toBe(periodTitle(TODAY, 'week', 7, 'en-US'));

        expect(style(root, '--axis-minutes')).toBe(String(7 * 600));
        expect(style(root, '--window-minutes')).toBe('600');
        expect(style(root, '--slot-minutes')).toBe('30');
        expect(style(root, '--slot-count')).toBe(String((7 * 600) / 30));
    });

    it('places an event in axis minutes and as a percentage of the axis', () => {
        const wrapper = mountTimeline({ events: EVENTS, ...HOURS });
        const install = eventElement(wrapper, 'install');

        expect(style(install, '--event-start')).toBe('60');
        expect(style(install, '--event-end')).toBe('150');
        expect(style(install, '--event-offset')).toBe('10%');
        expect(style(install, '--event-length')).toBe('15%');
    });

    it('offsets a later day of the week by whole windows', () => {
        const wrapper = mountTimeline({ view: 'week', events: EVENTS, ...HOURS });

        // Wednesday is the fourth day of a week starting Sunday.
        expect(style(eventElement(wrapper, 'install'), '--event-start')).toBe(String(3 * 600 + 60));
    });

    it('puts overlapping events in separate lanes and sizes the row to fit', () => {
        const wrapper = mountTimeline({ events: EVENTS, ...HOURS });

        expect(style(eventElement(wrapper, 'install'), '--event-lane')).toBe('0');
        expect(style(eventElement(wrapper, 'repair'), '--event-lane')).toBe('1');
        expect(style(eventElement(wrapper, 'survey'), '--event-lane')).toBe('0');
        expect(style(wrapper.get('[data-unassigned]').element, '--row-lanes')).toBe('2');
    });

    it('marks an event cut off by the hidden hours', () => {
        const wrapper = mountTimeline({
            events: [
                {
                    id: 'early',
                    title: 'Early',
                    start: '2026-10-14T07:00',
                    end: '2026-10-14T09:00',
                },
                { id: 'late', title: 'Late', start: '2026-10-14T17:00', end: '2026-10-14T19:00' },
            ] satisfies TestEvent[],
            ...HOURS,
        });
        const early = eventElement(wrapper, 'early');
        const late = eventElement(wrapper, 'late');

        expect(early.hasAttribute('data-starts-before')).toBe(true);
        expect(early.hasAttribute('data-ends-after')).toBe(false);
        expect(style(early, '--event-start')).toBe('0');
        expect(late.hasAttribute('data-ends-after')).toBe(true);
        expect(style(late, '--event-end')).toBe('600');
    });

    it('draws one row per resource, marking idle rows and tagging tracks for drops', () => {
        const wrapper = mountTimeline({
            events: ASSIGNED,
            resources: RESOURCES,
            getResourceIds: (event: TestEvent) => event.resourceIds,
            ...HOURS,
        });
        const [ana, bo] = wrapper.findAll('[role="group"] [role="group"]');

        expect(tracks(wrapper).map((track) => track.dataset.resourceId)).toEqual(['ana', 'bo']);
        expect(ana.attributes('data-idle')).toBeUndefined();
        expect(bo.attributes('data-idle')).toBe('');
        expect(bo.attributes('data-unassigned')).toBeUndefined();
    });

    it('labels the single row of a calendar without resources as unassigned', () => {
        const wrapper = mountTimeline();
        const row = wrapper.get('[data-unassigned]');

        expect(row.attributes('aria-label')).toBe('Unassigned');
        expect(row.attributes('data-idle')).toBe('');
        expect(tracks(wrapper)[0].dataset.resourceId).toBeUndefined();
    });
});

describe('TimelineNow', () => {
    const line = (wrapper: CalendarWrapper) => wrapper.find('[aria-hidden="true"]');

    it('sits at now along the axis, in minutes and as a percentage', () => {
        const wrapper = mountTimeline({ view: 'week', now: now('2026-10-14T11:00'), ...HOURS });
        const offset = 3 * 600 + 180;

        expect(style(line(wrapper).element, '--now')).toBe(String(offset));
        expect(style(line(wrapper).element, '--now-offset')).toBe(`${(offset / 4200) * 100}%`);
    });

    it('reads now in the calendar time zone', () => {
        const wrapper = mountTimeline({
            now: Temporal.ZonedDateTime.from('2026-10-14T16:00[UTC]'),
            ...HOURS,
        });

        // 16:00 UTC is 11:00 in Chicago (CDT).
        expect(style(line(wrapper).element, '--now')).toBe('180');
    });

    it('renders only while now is inside a visible day’s window', async () => {
        const wrapper = mountTimeline({ now: now('2026-10-14T07:59'), ...HOURS });

        expect(line(wrapper).exists()).toBe(false);

        await wrapper.setProps({ now: now('2026-10-14T18:00') });
        expect(line(wrapper).exists()).toBe(true);

        await wrapper.setProps({ now: now('2026-10-14T18:01') });
        expect(line(wrapper).exists()).toBe(false);

        await wrapper.setProps({ now: now('2026-10-15T12:00') });
        expect(line(wrapper).exists()).toBe(false);
    });
});

describe('Timeline interactions', () => {
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

    /** One pixel per axis minute, each track 40px below the last. */
    function layOutTracks(wrapper: CalendarWrapper) {
        tracks(wrapper).forEach((track, index) =>
            layOut(track, { top: index * 40, width: 600, height: 40 }),
        );
    }

    function mountEditable(props: Record<string, unknown> = {}) {
        const wrapper = mountTimeline({
            events: ASSIGNED,
            resources: RESOURCES,
            getResourceIds: (event: TestEvent) => event.resourceIds,
            editable: true,
            selectable: true,
            ...HOURS,
            ...props,
        });

        layOutTracks(wrapper);

        return wrapper;
    }

    async function drag(
        wrapper: CalendarWrapper,
        grab: Element,
        from: { x: number; track: number },
        to: { x: number; track: number },
    ) {
        const fromY = from.track * 40 + 20;
        const toY = to.track * 40 + 20;

        pointerOver(grab, tracks(wrapper)[from.track]);
        grab.dispatchEvent(pointer('pointerdown', { clientX: from.x, clientY: fromY }));
        pointerOver(tracks(wrapper)[to.track]);
        window.dispatchEvent(pointer('pointermove', { clientX: to.x, clientY: toY }));
        await nextTick();
        window.dispatchEvent(pointer('pointerup', { clientX: to.x, clientY: toY }));
        await nextTick();
    }

    it('moves an event along the hours by the pointer’s distance, snapped', async () => {
        const wrapper = mountEditable();

        await drag(
            wrapper,
            eventElement(wrapper, 'install'),
            { x: 70, track: 0 },
            { x: 162, track: 0 },
        );

        expect(drops(wrapper)).toHaveLength(1);
        expect(wall(drops(wrapper)[0].start)).toBe('2026-10-14T10:30:00');
        expect(wall(drops(wrapper)[0].end)).toBe('2026-10-14T11:30:00');
        expect(drops(wrapper)[0].resourceId).toBeUndefined();
    });

    it('moves an event to the resource row under the pointer', async () => {
        const wrapper = mountEditable();

        await drag(
            wrapper,
            eventElement(wrapper, 'install'),
            { x: 70, track: 0 },
            { x: 70, track: 1 },
        );

        expect(drops(wrapper)[0]).toMatchObject({ resourceId: 'bo', previousResourceId: 'ana' });
        expect(wall(drops(wrapper)[0].start)).toBe('2026-10-14T09:00:00');
    });

    it('resizes from the end handle', async () => {
        const wrapper = mountEditable();
        const handle = eventElement(wrapper, 'install').querySelector('[data-edge="end"]')!;

        await drag(wrapper, handle, { x: 120, track: 0 }, { x: 180, track: 0 });

        expect(resizes(wrapper)).toHaveLength(1);
        expect(wall(resizes(wrapper)[0].start)).toBe('2026-10-14T09:00:00');
        expect(wall(resizes(wrapper)[0].end)).toBe('2026-10-14T11:00:00');
    });

    it('moves by the snap interval with Left and Right, and between rows with Up and Down', async () => {
        const wrapper = mountEditable({ snapMinutes: 30 });
        const button = eventElement(wrapper, 'install').querySelector('button')!;

        button.focus();
        button.dispatchEvent(
            new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
        );
        await nextTick();
        await pressOnWindow('ArrowRight');
        await pressOnWindow('ArrowDown');
        expect(eventElement(wrapper, 'install').closest('[data-drop]')).toBe(tracks(wrapper)[1]);

        await pressOnWindow(' ');

        expect(wall(drops(wrapper)[0].start)).toBe('2026-10-14T09:30:00');
        expect(drops(wrapper)[0].resourceId).toBe('bo');
    });

    it('drags out a selection in one row, then reports it with the row’s resource', async () => {
        const wrapper = mountEditable();
        const [, bo] = tracks(wrapper);
        const selection = () => wrapper.findAll('[data-drop="axis"] > [aria-hidden="true"]');

        pointerOver(bo);
        bo.dispatchEvent(pointer('pointerdown', { clientX: 125, clientY: 50 }));
        window.dispatchEvent(pointer('pointermove', { clientX: 230, clientY: 50 }));
        await nextTick();

        expect(selection()).toHaveLength(1);
        expect(selection()[0].element.parentElement).toBe(bo);
        expect(style(selection()[0].element, '--selection-start')).toBe('120');
        expect(style(selection()[0].element, '--selection-end')).toBe('240');
        expect(style(selection()[0].element, '--selection-offset')).toBe('20%');
        expect(style(selection()[0].element, '--selection-length')).toBe('20%');

        window.dispatchEvent(pointer('pointerup', { clientX: 230, clientY: 50 }));
        await nextTick();

        expect(selection()).toHaveLength(0);
        expect(selections(wrapper)).toHaveLength(1);
        expect(wall(selections(wrapper)[0].start)).toBe('2026-10-14T10:00:00');
        expect(wall(selections(wrapper)[0].end)).toBe('2026-10-14T12:00:00');
        expect(selections(wrapper)[0]).toMatchObject({ allDay: false, resourceId: 'bo' });
    });
});
