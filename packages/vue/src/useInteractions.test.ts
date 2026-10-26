import { nextTick } from 'vue';
import { enableAutoUnmount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    announcement,
    cell,
    eventElement,
    installPointerStub,
    layOutMinutes,
    mountMonth,
    mountResources,
    mountWeek,
    pointer,
    pointerOver,
    pressOnWindow,
    type CalendarWrapper,
    type TestEvent,
} from './test-harness.js';
import type { EventDropDetail, RangeSelectDetail } from './useInteractions.js';

const allDay: TestEvent[] = [{ id: 1, title: 'Offsite', start: '2026-10-14' }];

const timed: TestEvent[] = [
    { id: 1, title: 'Standup', start: '2026-10-14T09:00:00', end: '2026-10-14T10:00:00' },
];

const assigned: TestEvent[] = [
    { id: 1, title: 'Install', start: '2026-10-14', resourceIds: ['ana'] },
];

const drops = (wrapper: CalendarWrapper) =>
    (wrapper.emitted('event-drop') ?? []).map(([detail]) => detail as EventDropDetail<TestEvent>);
const resizes = (wrapper: CalendarWrapper) =>
    (wrapper.emitted('event-resize') ?? []).map(([detail]) => detail as EventDropDetail<TestEvent>);
const selections = (wrapper: CalendarWrapper) =>
    (wrapper.emitted('range-select') ?? []).map(([detail]) => detail as RangeSelectDetail);

/** Wall-clock text, so assertions don't depend on the zone's offset formatting. */
const wall = (value: Temporal.PlainDate | Temporal.ZonedDateTime) =>
    value instanceof Temporal.ZonedDateTime ? value.toPlainDateTime().toString() : value.toString();

const startDayOf = (wrapper: CalendarWrapper, id: string | number) =>
    eventElement(wrapper, id)
        .closest('[role="gridcell"], [data-drop="time"]')
        ?.getAttribute('data-date');

async function pickUp(wrapper: CalendarWrapper, id: string | number) {
    const button = eventElement(wrapper, id).querySelector('button')!;

    button.focus();
    button.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
    );
    await nextTick();
}

enableAutoUnmount(afterEach);

describe('keyboard moves', () => {
    it('picks up with Space, moves with arrows, and drops with Space', async () => {
        const wrapper = mountMonth({ events: allDay, editable: true });

        await pickUp(wrapper, 1);
        expect(announcement(wrapper)).toMatch(/^Picked up\./);

        await pressOnWindow('ArrowRight');
        expect(startDayOf(wrapper, 1)).toBe('2026-10-15');
        expect(eventElement(wrapper, 1).hasAttribute('data-dragging')).toBe(true);
        expect(announcement(wrapper)).toBe('Thu, Oct 15 to Thu, Oct 15');

        await pressOnWindow('ArrowDown');
        await pressOnWindow(' ');

        expect(drops(wrapper)).toHaveLength(1);
        expect(drops(wrapper)[0]).toMatchObject({ event: allDay[0], allDay: true });
        expect(wall(drops(wrapper)[0].start)).toBe('2026-10-22');
        expect(wall(drops(wrapper)[0].end)).toBe('2026-10-22');
        expect(wall(drops(wrapper)[0].previousStart)).toBe('2026-10-14');
        expect(announcement(wrapper)).toBe('Dropped. Thu, Oct 22 to Thu, Oct 22.');
    });

    it('never changes the events prop: the preview goes away once the app has the intent', async () => {
        const wrapper = mountMonth({ events: allDay, editable: true });

        await pickUp(wrapper, 1);
        await pressOnWindow('ArrowRight');
        await pressOnWindow('Enter');

        expect(drops(wrapper)).toHaveLength(1);
        expect(startDayOf(wrapper, 1)).toBe('2026-10-14');
        expect(eventElement(wrapper, 1).hasAttribute('data-dragging')).toBe(false);
    });

    it('stretches the end with Shift+arrows and reports a resize', async () => {
        const wrapper = mountMonth({ events: allDay, editable: true });

        await pickUp(wrapper, 1);
        await pressOnWindow('ArrowRight', { shiftKey: true });
        await pressOnWindow('ArrowRight', { shiftKey: true });
        await pressOnWindow(' ');

        expect(drops(wrapper)).toHaveLength(0);
        expect(resizes(wrapper)).toHaveLength(1);
        expect(wall(resizes(wrapper)[0].start)).toBe('2026-10-14');
        expect(wall(resizes(wrapper)[0].end)).toBe('2026-10-16');
    });

    it('puts the event back on Escape and reports nothing', async () => {
        const wrapper = mountMonth({ events: allDay, editable: true });

        await pickUp(wrapper, 1);
        await pressOnWindow('ArrowRight');
        await pressOnWindow('Escape');

        expect(drops(wrapper)).toHaveLength(0);
        expect(startDayOf(wrapper, 1)).toBe('2026-10-14');
        expect(announcement(wrapper)).toBe('Move cancelled.');
    });

    it('reports nothing when dropped where it started', async () => {
        const wrapper = mountMonth({ events: allDay, editable: true });

        await pickUp(wrapper, 1);
        await pressOnWindow('ArrowRight');
        await pressOnWindow('ArrowLeft');
        await pressOnWindow(' ');

        expect(drops(wrapper)).toHaveLength(0);
    });

    it('returns focus to the event after each move', async () => {
        const wrapper = mountMonth({ events: allDay, editable: true });

        await pickUp(wrapper, 1);
        await pressOnWindow('ArrowRight');

        expect(document.activeElement?.closest('[data-event-id]')).toBe(eventElement(wrapper, 1));
    });

    it('ignores Space unless the calendar is editable and canEdit allows the event', async () => {
        const readOnly = mountMonth({ events: allDay });

        await pickUp(readOnly, 1);
        await pressOnWindow('ArrowRight');
        expect(startDayOf(readOnly, 1)).toBe('2026-10-14');
        expect(eventElement(readOnly, 1).hasAttribute('data-editable')).toBe(false);

        const locked = mountMonth({ events: allDay, editable: true, canEdit: () => false });

        await pickUp(locked, 1);
        await pressOnWindow('ArrowRight');
        expect(startDayOf(locked, 1)).toBe('2026-10-14');
        expect(eventElement(locked, 1).hasAttribute('data-editable')).toBe(false);
    });

    it('moves timed events by the snap interval on the vertical axis', async () => {
        const wrapper = mountWeek({ events: timed, editable: true, snapMinutes: 30 });

        await pickUp(wrapper, 1);
        await pressOnWindow('ArrowDown');
        await pressOnWindow('ArrowRight');
        await pressOnWindow(' ');

        expect(wall(drops(wrapper)[0].start)).toBe('2026-10-15T09:30:00');
        expect(wall(drops(wrapper)[0].end)).toBe('2026-10-15T10:30:00');
        expect(drops(wrapper)[0].allDay).toBe(false);
    });

    it('moves between resource rows with up and down', async () => {
        const wrapper = mountResources({ events: assigned, editable: true });

        await pickUp(wrapper, 1);
        await pressOnWindow('ArrowDown');
        expect(eventElement(wrapper, 1).closest('[data-row]')?.getAttribute('data-row')).toBe('1');

        await pressOnWindow(' ');
        expect(drops(wrapper)[0]).toMatchObject({ resourceId: 'bo', previousResourceId: 'ana' });
        expect(wall(drops(wrapper)[0].start)).toBe('2026-10-14');
    });
});

describe('pointer drags', () => {
    beforeEach(installPointerStub);

    /** Presses on the event over `from`, then moves over `to` far enough to start a drag. */
    async function dragTo(
        wrapper: CalendarWrapper,
        id: string | number,
        from: Element,
        to: Element,
        { fromY = 0, toY = 0, handle = false } = {},
    ) {
        const bar = eventElement(wrapper, id);
        const grab = handle ? bar.querySelector('[data-edge="end"]')! : bar;

        pointerOver(bar, from);
        grab.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: fromY }));
        pointerOver(to);
        window.dispatchEvent(pointer('pointermove', { clientX: 40, clientY: toY }));
        await nextTick();
    }

    it('moves an event to the day under the pointer and reports it on release', async () => {
        const wrapper = mountMonth({ events: allDay, editable: true });

        await dragTo(wrapper, 1, cell(wrapper, '2026-10-14'), cell(wrapper, '2026-10-16'));
        expect(startDayOf(wrapper, 1)).toBe('2026-10-16');
        expect(eventElement(wrapper, 1).hasAttribute('data-dragging')).toBe(true);

        window.dispatchEvent(pointer('pointerup'));
        await nextTick();

        expect(drops(wrapper)).toHaveLength(1);
        expect(wall(drops(wrapper)[0].start)).toBe('2026-10-16');
        expect(wall(drops(wrapper)[0].previousStart)).toBe('2026-10-14');
        expect(eventElement(wrapper, 1).hasAttribute('data-dragging')).toBe(false);
    });

    it('measures from the day grabbed, not the day the bar starts in', async () => {
        const wrapper = mountMonth({
            events: [{ id: 1, title: 'Trip', start: '2026-10-13', end: '2026-10-15' }],
            editable: true,
        });

        // The bar's DOM parent is its start day (the 13th), but it's grabbed over the 15th.
        await dragTo(wrapper, 1, cell(wrapper, '2026-10-15'), cell(wrapper, '2026-10-16'));
        window.dispatchEvent(pointer('pointerup'));
        await nextTick();

        expect(wall(drops(wrapper)[0].start)).toBe('2026-10-14');
        expect(wall(drops(wrapper)[0].end)).toBe('2026-10-16');
    });

    it('treats a press that barely moves as a click, not a drag', async () => {
        const wrapper = mountMonth({ events: allDay, editable: true });
        const bar = eventElement(wrapper, 1);

        pointerOver(bar, cell(wrapper, '2026-10-14'));
        bar.dispatchEvent(pointer('pointerdown', { clientX: 0, clientY: 0 }));
        pointerOver(cell(wrapper, '2026-10-16'));
        window.dispatchEvent(pointer('pointermove', { clientX: 2, clientY: 1 }));
        window.dispatchEvent(pointer('pointerup'));
        await nextTick();

        expect(drops(wrapper)).toHaveLength(0);
        expect(startDayOf(wrapper, 1)).toBe('2026-10-14');
    });

    it('drops nothing when the browser cancels the pointer', async () => {
        const wrapper = mountMonth({ events: allDay, editable: true });

        await dragTo(wrapper, 1, cell(wrapper, '2026-10-14'), cell(wrapper, '2026-10-16'));
        window.dispatchEvent(pointer('pointercancel'));
        await nextTick();

        expect(startDayOf(wrapper, 1)).toBe('2026-10-14');

        window.dispatchEvent(pointer('pointerup'));
        expect(drops(wrapper)).toHaveLength(0);
    });

    it('drops nothing when Escape is pressed mid-drag', async () => {
        const wrapper = mountMonth({ events: allDay, editable: true });

        await dragTo(wrapper, 1, cell(wrapper, '2026-10-14'), cell(wrapper, '2026-10-16'));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        window.dispatchEvent(pointer('pointerup'));
        await nextTick();

        expect(drops(wrapper)).toHaveLength(0);
        expect(startDayOf(wrapper, 1)).toBe('2026-10-14');
    });

    it('ignores touch, so the page can still scroll', async () => {
        const wrapper = mountMonth({ events: allDay, editable: true });
        const bar = eventElement(wrapper, 1);

        pointerOver(bar, cell(wrapper, '2026-10-14'));
        bar.dispatchEvent(pointer('pointerdown', { pointerType: 'touch' }));
        pointerOver(cell(wrapper, '2026-10-16'));
        window.dispatchEvent(pointer('pointermove', { clientX: 40, pointerType: 'touch' }));
        window.dispatchEvent(pointer('pointerup', { pointerType: 'touch' }));
        await nextTick();

        expect(drops(wrapper)).toHaveLength(0);
    });

    it('resizes from the end handle and reports a resize', async () => {
        const wrapper = mountMonth({ events: allDay, editable: true });

        await dragTo(wrapper, 1, cell(wrapper, '2026-10-14'), cell(wrapper, '2026-10-17'), {
            handle: true,
        });
        window.dispatchEvent(pointer('pointerup'));
        await nextTick();

        expect(drops(wrapper)).toHaveLength(0);
        expect(wall(resizes(wrapper)[0].start)).toBe('2026-10-14');
        expect(wall(resizes(wrapper)[0].end)).toBe('2026-10-17');
    });

    it('reads minutes from the pointer height in a time column', async () => {
        const wrapper = mountWeek({ events: timed, editable: true });
        const [wednesday, thursday] = ['2026-10-14', '2026-10-15'].map(
            (value) => wrapper.get(`[data-drop="time"][data-date="${value}"]`).element,
        );

        layOutMinutes(wednesday);
        layOutMinutes(thursday);

        // Grabbed at 9:20, released at 10:35: an hour and a quarter later, snapped to 15 minutes.
        await dragTo(wrapper, 1, wednesday, thursday, { fromY: 560, toY: 635 });
        window.dispatchEvent(pointer('pointerup'));
        await nextTick();

        expect(wall(drops(wrapper)[0].start)).toBe('2026-10-15T10:15:00');
        expect(wall(drops(wrapper)[0].end)).toBe('2026-10-15T11:15:00');
    });

    it('moves an event to another resource row', async () => {
        const wrapper = mountResources({ events: assigned, editable: true });

        await dragTo(wrapper, 1, cell(wrapper, '2026-10-14', 0), cell(wrapper, '2026-10-15', 1));
        expect(eventElement(wrapper, 1).closest('[data-row]')?.getAttribute('data-row')).toBe('1');

        window.dispatchEvent(pointer('pointerup'));
        await nextTick();

        expect(drops(wrapper)[0]).toMatchObject({ resourceId: 'bo', previousResourceId: 'ana' });
        expect(wall(drops(wrapper)[0].start)).toBe('2026-10-15');
    });

    it('swallows the click that ends a drag, so a link in the event does not open', async () => {
        const wrapper = mountMonth({ events: allDay, editable: true });
        let clicks = 0;
        // On the document: the bar's element is replaced each time it renders in another cell.
        const count = () => clicks++;

        document.addEventListener('click', count);
        await dragTo(wrapper, 1, cell(wrapper, '2026-10-14'), cell(wrapper, '2026-10-16'));
        window.dispatchEvent(pointer('pointerup'));
        await nextTick();

        const click = new MouseEvent('click', { bubbles: true, cancelable: true });

        eventElement(wrapper, 1).dispatchEvent(click);
        document.removeEventListener('click', count);

        expect(click.defaultPrevented).toBe(true);
        expect(clicks).toBe(0);
    });
});

describe('range select', () => {
    beforeEach(installPointerStub);

    it('selects whole days across cells and reports an all-day range', async () => {
        const wrapper = mountMonth({ selectable: true });
        const anchor = cell(wrapper, '2026-10-15');

        pointerOver(anchor);
        anchor.dispatchEvent(pointer('pointerdown'));
        pointerOver(cell(wrapper, '2026-10-13'));
        window.dispatchEvent(pointer('pointermove'));
        await nextTick();

        expect(
            wrapper.findAll('[data-selected]').map((day) => day.attributes('data-date')),
        ).toEqual(['2026-10-13', '2026-10-14', '2026-10-15']);

        window.dispatchEvent(pointer('pointerup'));
        await nextTick();

        expect(selections(wrapper)).toHaveLength(1);
        expect(wall(selections(wrapper)[0].start)).toBe('2026-10-13');
        expect(wall(selections(wrapper)[0].end)).toBe('2026-10-15');
        expect(selections(wrapper)[0].allDay).toBe(true);
        expect(wrapper.find('[data-selected]').exists()).toBe(false);
    });

    it('selects snapped minutes in a time column', async () => {
        const wrapper = mountWeek({ selectable: true });
        const column = wrapper.get('[data-drop="time"][data-date="2026-10-14"]').element;

        layOutMinutes(column);
        pointerOver(column);
        // 9:12 floors to 9:00 (rounding would give 9:15), and 10:50 ceils to 11:00.
        column.dispatchEvent(pointer('pointerdown', { clientY: 552 }));
        window.dispatchEvent(pointer('pointermove', { clientY: 650 }));
        window.dispatchEvent(pointer('pointerup'));
        await nextTick();

        expect(wall(selections(wrapper)[0].start)).toBe('2026-10-14T09:00:00');
        expect(wall(selections(wrapper)[0].end)).toBe('2026-10-14T11:00:00');
        expect(selections(wrapper)[0].allDay).toBe(false);
    });

    it('carries the resource row of the selection', async () => {
        const wrapper = mountResources({ selectable: true });
        const anchor = cell(wrapper, '2026-10-14', 1);

        pointerOver(anchor);
        anchor.dispatchEvent(pointer('pointerdown'));
        window.dispatchEvent(pointer('pointerup'));
        await nextTick();

        expect(selections(wrapper)[0]).toMatchObject({ allDay: true, resourceId: 'bo' });
    });

    it('starts nothing from an event, or when the calendar is not selectable', async () => {
        const fromEvent = mountMonth({ selectable: true, events: allDay });
        const bar = eventElement(fromEvent, 1);

        pointerOver(bar, cell(fromEvent, '2026-10-14'));
        bar.dispatchEvent(pointer('pointerdown'));
        window.dispatchEvent(pointer('pointerup'));

        const off = mountMonth();
        const anchor = cell(off, '2026-10-14');

        pointerOver(anchor);
        anchor.dispatchEvent(pointer('pointerdown'));
        window.dispatchEvent(pointer('pointerup'));
        await nextTick();

        expect(selections(fromEvent)).toHaveLength(0);
        expect(selections(off)).toHaveLength(0);
    });

    it('cancels on Escape', async () => {
        const wrapper = mountMonth({ selectable: true });
        const anchor = cell(wrapper, '2026-10-14');

        pointerOver(anchor);
        anchor.dispatchEvent(pointer('pointerdown'));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        window.dispatchEvent(pointer('pointerup'));
        await nextTick();

        expect(selections(wrapper)).toHaveLength(0);
    });
});
