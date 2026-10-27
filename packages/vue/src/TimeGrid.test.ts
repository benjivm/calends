import { nextTick } from 'vue';
import { enableAutoUnmount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { date, eventElement, mountWeek, type CalendarWrapper } from './test-harness.js';

const column = (wrapper: CalendarWrapper, value: string) =>
    wrapper.get<HTMLElement>(`[data-drop="time"][data-date="${value}"]`).element;

const focusable = (wrapper: CalendarWrapper) =>
    wrapper.findAll('[data-drop="time"][tabindex="0"]').map((day) => day.attributes('data-date'));

async function press(key: string, init: KeyboardEventInit = {}) {
    (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
    );
    await nextTick();
    await nextTick();
}

const active = () => document.activeElement as HTMLElement;
const focusedDay = () => active().dataset.date;
const focusedEvent = () => active().closest<HTMLElement>('[data-event-id]')?.dataset.eventId;

const EVENTS = [
    { id: 'standup', title: 'Standup', start: '2026-10-14T09:00', end: '2026-10-14T09:15' },
    { id: 'review', title: 'Review', start: '2026-10-14T13:00', end: '2026-10-14T14:00' },
];

enableAutoUnmount(afterEach);

describe('TimeGrid keyboard', () => {
    it('makes only the focused day tabbable, and labels it with its event count', () => {
        const wrapper = mountWeek({ events: EVENTS });

        expect(focusable(wrapper)).toEqual(['2026-10-14']);
        expect(column(wrapper, '2026-10-14').getAttribute('data-focused')).toBe('');
        expect(column(wrapper, '2026-10-14').getAttribute('aria-label')).toBe(
            'Wednesday, October 14, 2026, 2 events',
        );
    });

    it('moves between days with Left and Right, paging past the week', async () => {
        const wrapper = mountWeek();

        column(wrapper, '2026-10-14').focus();
        await press('ArrowRight');
        expect(focusedDay()).toBe('2026-10-15');

        await press('End');
        expect(focusedDay()).toBe('2026-10-17');

        await press('ArrowRight');
        expect(focusedDay()).toBe('2026-10-18');
        expect(focusable(wrapper)).toEqual(['2026-10-18']);

        await press('Home');
        expect(focusedDay()).toBe('2026-10-18');

        await press('PageUp');
        expect(focusedDay()).toBe('2026-10-11');
    });

    it('steps into and through a day of events with Down and Up', async () => {
        const wrapper = mountWeek({ events: EVENTS });

        column(wrapper, '2026-10-14').focus();
        await press('ArrowDown');
        expect(focusedEvent()).toBe('standup');

        await press('ArrowDown');
        expect(focusedEvent()).toBe('review');

        await press('ArrowDown');
        expect(focusedEvent()).toBe('review');

        await press('ArrowUp');
        await press('ArrowUp');
        expect(focusedDay()).toBe('2026-10-14');
        expect(focusedEvent()).toBeUndefined();

        await press('ArrowUp');
        expect(focusedEvent()).toBe('review');
    });

    it('goes from an event to the next or previous day with Left and Right', async () => {
        const wrapper = mountWeek({ events: EVENTS });

        column(wrapper, '2026-10-14').focus();
        await press('ArrowDown');
        await press('ArrowRight');
        expect(focusedDay()).toBe('2026-10-15');

        await press('ArrowLeft');
        await press('ArrowDown');
        await press('ArrowLeft');
        expect(focusedDay()).toBe('2026-10-13');
    });

    it('leaves keys alone inside an event, away from its focus target', async () => {
        const wrapper = mountWeek({ events: EVENTS });
        const input = document.createElement('input');

        eventElement(wrapper, 'standup').append(input);
        input.focus();
        await press('ArrowDown');

        expect(active()).toBe(input);
    });

    it('leaves the keys to a picked-up event', async () => {
        const wrapper = mountWeek({ events: EVENTS, editable: true });

        column(wrapper, '2026-10-14').focus();
        await press('ArrowDown');
        await press(' ');
        await press('ArrowDown');

        expect(focusedEvent()).toBe('standup');
        expect(eventElement(wrapper, 'standup').hasAttribute('data-dragging')).toBe(true);
    });
});

describe('NowIndicator', () => {
    const now = (value: string) => Temporal.ZonedDateTime.from(`${value}[America/Chicago]`);
    const lines = (wrapper: CalendarWrapper) =>
        wrapper.findAll<HTMLElement>('[data-drop="time"] > [aria-hidden="true"]');

    it('renders only in today’s column, at now in minutes and as a share of the window', () => {
        const wrapper = mountWeek({
            now: now('2026-10-14T12:00'),
            slotMinMinutes: 8 * 60,
            slotMaxMinutes: 18 * 60,
        });
        const [line] = lines(wrapper);

        expect(lines(wrapper)).toHaveLength(1);
        expect(line.element.parentElement?.dataset.date).toBe('2026-10-14');
        expect(line.element.style.getPropertyValue('--now')).toBe('240');
        expect(line.element.style.getPropertyValue('--now-offset')).toBe('40%');
    });

    it('hides outside the visible hours, and follows the now prop', async () => {
        const wrapper = mountWeek({
            now: now('2026-10-14T07:00'),
            slotMinMinutes: 8 * 60,
            slotMaxMinutes: 18 * 60,
        });

        expect(lines(wrapper)).toHaveLength(0);

        await wrapper.setProps({ now: now('2026-10-14T08:30') });
        expect(lines(wrapper)[0].element.style.getPropertyValue('--now')).toBe('30');

        await wrapper.setProps({ now: now('2026-10-14T19:00') });
        expect(lines(wrapper)).toHaveLength(0);
    });

    it('renders nowhere when today is outside the week', () => {
        const wrapper = mountWeek({ now: now('2026-10-14T12:00'), date: date('2026-10-21') });

        expect(lines(wrapper)).toHaveLength(0);
    });
});
