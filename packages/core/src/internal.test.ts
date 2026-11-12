import { describe, expect, it } from 'vitest';
import { groupByResource, lastCoveredDay, wallEndMinutes } from './internal.js';

const zoned = (value: string) => Temporal.ZonedDateTime.from(value);

describe('wallEndMinutes', () => {
    it('is the wall-clock end on an ordinary day', () => {
        expect(
            wallEndMinutes(
                zoned('2026-11-02T09:00[America/New_York]'),
                zoned('2026-11-02T10:30[America/New_York]'),
            ),
        ).toBe(10 * 60 + 30);
    });

    it('runs for the real duration across the fall-back hour', () => {
        expect(
            wallEndMinutes(
                zoned('2026-11-01T01:45-04:00[America/New_York]'),
                zoned('2026-11-01T01:15-05:00[America/New_York]'),
            ),
        ).toBe(2 * 60 + 15);
    });
});

describe('lastCoveredDay', () => {
    it('leaves out the day an event ends on at midnight', () => {
        expect(
            lastCoveredDay(
                zoned('2026-11-02T22:00[UTC]'),
                zoned('2026-11-03T00:00[UTC]'),
            ).toString(),
        ).toBe('2026-11-02');
    });

    it('keeps the day of a zero-length event at midnight', () => {
        const midnight = zoned('2026-11-03T00:00[UTC]');

        expect(lastCoveredDay(midnight, midnight).toString()).toBe('2026-11-03');
    });
});

describe('groupByResource', () => {
    const resources = [{ id: 'ann' }, { id: 'bob' }];
    const group = (items: { name: string; ids?: string[] }[]) =>
        groupByResource(items, resources, (item) => item.ids);

    it('puts an item in each of its resources, once, in order', () => {
        const groups = group([
            { name: 'a', ids: ['ann', 'bob', 'ann'] },
            { name: 'b', ids: ['ann'] },
        ]);

        expect(groups.get('ann')?.map((item) => item.name)).toEqual(['a', 'b']);
        expect(groups.get('bob')?.map((item) => item.name)).toEqual(['a']);
    });

    it('files items with no known resource under null', () => {
        const groups = group([{ name: 'a', ids: ['zed'] }, { name: 'b' }]);

        expect(groups.get(null)?.map((item) => item.name)).toEqual(['a', 'b']);
        expect(groups.has('zed')).toBe(false);
    });
});
