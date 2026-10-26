import { nextTick } from 'vue';
import { enableAutoUnmount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { cell, date, mountResources, type TestEvent } from './test-harness.js';

async function press(key: string, init: KeyboardEventInit = {}) {
    (document.activeElement as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
    );
    await nextTick();
    await nextTick();
}

const focused = () => {
    const element = document.activeElement as HTMLElement;

    return `${element.dataset.row}:${element.dataset.date}`;
};

enableAutoUnmount(afterEach);

describe('ResourceGrid keyboard', () => {
    it('makes one cell tabbable: the focused date in the focused row', () => {
        const wrapper = mountResources();

        expect(
            wrapper
                .findAll('[role="gridcell"][tabindex="0"]')
                .map((day) => `${day.attributes('data-row')}:${day.attributes('data-date')}`),
        ).toEqual(['0:2026-10-14']);
    });

    it('moves across days and down rows, clamping at the last row', async () => {
        const wrapper = mountResources();

        cell(wrapper, '2026-10-14', 0).focus();
        await press('ArrowRight');
        expect(focused()).toBe('0:2026-10-15');

        await press('ArrowDown');
        await press('ArrowDown');
        expect(focused()).toBe('1:2026-10-15');

        await press('ArrowUp');
        expect(focused()).toBe('0:2026-10-15');
    });

    it('jumps to the ends of the period with Home and End, and of the rows with Ctrl', async () => {
        const wrapper = mountResources();

        cell(wrapper, '2026-10-14', 0).focus();
        await press('End');
        expect(focused()).toBe('0:2026-10-17');

        await press('Home');
        expect(focused()).toBe('0:2026-10-11');

        await press('End', { ctrlKey: true });
        expect(focused()).toBe('1:2026-10-11');
    });

    it('pages to the next week when focus leaves this one, keeping the row', async () => {
        const wrapper = mountResources();

        cell(wrapper, '2026-10-17', 1).focus();
        await press('ArrowRight');

        expect(wrapper.emitted('update:date')?.at(-1)).toEqual([date('2026-10-18')]);
        expect(focused()).toBe('1:2026-10-18');
    });
});

describe('ResourceGrid state', () => {
    const events: TestEvent[] = [
        { id: 1, title: 'Install', start: '2026-10-13', end: '2026-10-14', resourceIds: ['ana'] },
        { id: 2, title: 'Repair', start: '2026-10-14', resourceIds: ['ana'] },
    ];

    it('marks busy and double-booked cells, and idle rows', () => {
        const wrapper = mountResources({ events });
        const rows = wrapper.findAll('[role="row"]');

        expect(cell(wrapper, '2026-10-13', 0).hasAttribute('data-busy')).toBe(true);
        expect(cell(wrapper, '2026-10-13', 0).hasAttribute('data-overlap')).toBe(false);
        expect(cell(wrapper, '2026-10-14', 0).hasAttribute('data-overlap')).toBe(true);
        expect(rows[0].attributes('data-overlap')).toBe('');
        expect(rows[1].attributes('data-idle')).toBe('');
    });

    it('marks a day with two jobs at different times as busy, not double-booked', () => {
        const wrapper = mountResources({
            events: [
                {
                    id: 1,
                    title: 'Install',
                    start: '2026-10-14T07:00',
                    end: '2026-10-14T11:30',
                    resourceIds: ['ana'],
                },
                {
                    id: 2,
                    title: 'Repair',
                    start: '2026-10-14T12:30',
                    end: '2026-10-14T16:00',
                    resourceIds: ['ana'],
                },
            ] satisfies TestEvent[],
        });

        expect(cell(wrapper, '2026-10-14', 0).hasAttribute('data-busy')).toBe(true);
        expect(cell(wrapper, '2026-10-14', 0).hasAttribute('data-overlap')).toBe(false);
        expect(wrapper.findAll('[role="row"]')[0].attributes('data-overlap')).toBeUndefined();
    });

    it('labels each cell with its date and event count', () => {
        const wrapper = mountResources({ events });

        expect(cell(wrapper, '2026-10-14', 0).getAttribute('aria-label')).toBe(
            'Wednesday, October 14, 2026, 2 events',
        );
        expect(cell(wrapper, '2026-10-14', 1).getAttribute('aria-label')).toBe(
            'Wednesday, October 14, 2026, free',
        );
    });
});
