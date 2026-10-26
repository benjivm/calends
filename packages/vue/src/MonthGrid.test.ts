import { nextTick } from 'vue';
import { enableAutoUnmount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import {
    cell,
    date,
    eventElement,
    mountMonth,
    type CalendarWrapper,
    type TestEvent,
} from './test-harness.js';

const focusable = (wrapper: CalendarWrapper) =>
    wrapper.findAll('[role="gridcell"][tabindex="0"]').map((day) => day.attributes('data-date'));

async function press(wrapper: CalendarWrapper, key: string, init: KeyboardEventInit = {}) {
    (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
    );
    await nextTick();
    await nextTick();
}

const focused = () => (document.activeElement as HTMLElement | null)?.dataset.date;

enableAutoUnmount(afterEach);

describe('MonthGrid keyboard', () => {
    it('makes only the focused day tabbable', () => {
        const wrapper = mountMonth();

        expect(focusable(wrapper)).toEqual(['2026-10-14']);
        expect(cell(wrapper, '2026-10-14').getAttribute('data-focused')).toBe('');
    });

    it('moves focus by day and week with the arrow keys', async () => {
        const wrapper = mountMonth();

        cell(wrapper, '2026-10-14').focus();
        await press(wrapper, 'ArrowRight');
        expect(focused()).toBe('2026-10-15');

        await press(wrapper, 'ArrowDown');
        expect(focused()).toBe('2026-10-22');

        await press(wrapper, 'ArrowUp');
        await press(wrapper, 'ArrowLeft');
        expect(focused()).toBe('2026-10-14');
        expect(focusable(wrapper)).toEqual(['2026-10-14']);
    });

    it('jumps to the ends of the week with Home and End, honouring weekStartsOn', async () => {
        const wrapper = mountMonth({ weekStartsOn: 1 });

        cell(wrapper, '2026-10-14').focus();
        await press(wrapper, 'Home');
        expect(focused()).toBe('2026-10-12');

        await press(wrapper, 'End');
        expect(focused()).toBe('2026-10-18');
    });

    it('pages to the next month when focus leaves this one', async () => {
        const wrapper = mountMonth({ date: date('2026-10-31') });

        cell(wrapper, '2026-10-31').focus();
        await press(wrapper, 'ArrowRight');

        expect(wrapper.emitted('update:date')?.at(-1)).toEqual([date('2026-11-01')]);
        expect(wrapper.get('h2').text()).toBe('November 2026');
        expect(focused()).toBe('2026-11-01');
    });

    it('pages to the previous month when focus moves onto an outside day', async () => {
        const wrapper = mountMonth({ date: date('2026-10-01') });

        cell(wrapper, '2026-10-01').focus();
        await press(wrapper, 'ArrowLeft');

        expect(focused()).toBe('2026-09-30');
        expect(wrapper.emitted('update:date')?.at(-1)).toEqual([date('2026-09-30')]);
        expect(wrapper.get('h2').text()).toBe('September 2026');
    });

    it('pages by month with PageUp and PageDown, and by year with Shift', async () => {
        const wrapper = mountMonth();

        cell(wrapper, '2026-10-14').focus();
        await press(wrapper, 'PageDown');
        expect(focused()).toBe('2026-11-14');

        await press(wrapper, 'PageUp', { shiftKey: true });
        expect(focused()).toBe('2025-11-14');
        expect(wrapper.get('h2').text()).toBe('November 2025');
    });

    it('leaves keys alone when they come from inside an event', async () => {
        const wrapper = mountMonth({
            events: [{ id: 1, title: 'Offsite', start: '2026-10-14' }] satisfies TestEvent[],
        });

        eventElement(wrapper, 1).querySelector('button')!.focus();
        await press(wrapper, 'ArrowRight');

        expect(document.activeElement?.closest('[data-event-id]')).not.toBeNull();
        expect(focusable(wrapper)).toEqual(['2026-10-14']);
    });
});

describe('MonthGrid events', () => {
    it('places a bar in its start day with its span and lane as CSS variables', () => {
        const wrapper = mountMonth({
            events: [{ id: 1, title: 'Offsite', start: '2026-10-13', end: '2026-10-15' }],
        });
        const bar = eventElement(wrapper, 1);

        expect(bar.closest('[role="gridcell"]')?.getAttribute('data-date')).toBe('2026-10-13');
        expect(bar.style.getPropertyValue('--event-span')).toBe('3');
        expect(bar.style.getPropertyValue('--event-lane')).toBe('0');
        expect(bar.hasAttribute('data-all-day')).toBe(true);
    });

    it('splits a multi-week event and highlights every piece together', async () => {
        const wrapper = mountMonth({
            events: [{ id: 1, title: 'Trip', start: '2026-10-16', end: '2026-10-20' }],
        });
        const pieces = wrapper.findAll('[data-event-id="1"]');

        expect(pieces).toHaveLength(2);
        expect(pieces[0].attributes('data-continues-after')).toBe('');
        expect(pieces[1].attributes('data-continues-before')).toBe('');

        await pieces[0].trigger('pointerenter');
        expect(pieces.map((piece) => piece.attributes('data-highlighted'))).toEqual(['', '']);

        await pieces[0].trigger('pointerleave');
        expect(pieces.map((piece) => piece.attributes('data-highlighted'))).toEqual([
            undefined,
            undefined,
        ]);
    });

    it('marks events that ended before today as past', () => {
        const wrapper = mountMonth({
            events: [
                { id: 'old', title: 'Old', start: '2026-10-12' },
                { id: 'new', title: 'New', start: '2026-10-14' },
            ],
        });

        expect(eventElement(wrapper, 'old').hasAttribute('data-past')).toBe(true);
        expect(eventElement(wrapper, 'new').hasAttribute('data-past')).toBe(false);
    });
});

describe('MonthDayMore', () => {
    const busyDay: TestEvent[] = [
        { id: 1, title: 'One', start: '2026-10-14' },
        { id: 2, title: 'Two', start: '2026-10-14' },
        { id: 3, title: 'Three', start: '2026-10-14' },
    ];

    it('shows "+N more" for events past maxLanes, labelled with the full count', () => {
        const wrapper = mountMonth({ events: busyDay, maxLanes: 2 });
        const more = wrapper.findAll('[role="gridcell"] button[aria-label^="Show all"]');

        expect(more).toHaveLength(1);
        expect(more[0].text()).toBe('+2 more');
        expect(more[0].attributes('aria-label')).toBe('Show all 3 events on October 14');
        expect(more[0].attributes('type')).toBe('button');
        expect(cell(wrapper, '2026-10-14').hasAttribute('data-overflow')).toBe(true);
        expect(wrapper.findAll('[data-event-id]')).toHaveLength(1);
    });

    it('renders nothing when every event fits', () => {
        const wrapper = mountMonth({ events: busyDay });

        expect(wrapper.find('button[aria-label^="Show all"]').exists()).toBe(false);
        expect(wrapper.findAll('[data-event-id]')).toHaveLength(3);
    });

    it('draws a lone hidden bar in the "+N more" lane instead of "+1 more"', () => {
        const wrapper = mountMonth({ events: busyDay.slice(0, 2), maxLanes: 1 });

        expect(
            wrapper.findAll('button[aria-label^="Show all"]').map((more) => more.text()),
        ).toEqual(['+2 more']);

        const alone = mountMonth({
            events: [
                { id: 1, title: 'One', start: '2026-10-14' },
                { id: 2, title: 'Two', start: '2026-10-14' },
                { id: 3, title: 'Three', start: '2026-10-15' },
            ] satisfies TestEvent[],
            maxLanes: 2,
        });

        expect(alone.find('button[aria-label^="Show all"]').exists()).toBe(false);
        expect(alone.findAll('[data-event-id]')).toHaveLength(3);
    });
});
