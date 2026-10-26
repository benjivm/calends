import { describe, expect, it } from 'vitest';
import { normalizeEvent } from './events.js';
import { moveEvent, orderedRange, resizeEvent, snapMinutes, withTimes } from './interactions.js';

const chicago = { timeZone: 'America/Chicago' };
const date = (value: string) => Temporal.PlainDate.from(value);

const meeting = normalizeEvent(
    { id: 'm', start: '2026-10-12T09:00:00', end: '2026-10-12T10:30:00' },
    chicago,
);
const trip = normalizeEvent({ id: 't', start: '2026-10-12', end: '2026-10-14' }, chicago);

const clock = (time: Temporal.PlainDate | Temporal.ZonedDateTime) =>
    (time as Temporal.ZonedDateTime).toPlainDateTime().toString({ smallestUnit: 'minute' });

describe('moveEvent', () => {
    it('moves an all-day event by days, keeping its length', () => {
        const moved = moveEvent(trip, { days: 3, minutes: 90 });

        expect(moved.start).toEqual(date('2026-10-15'));
        expect(moved.end).toEqual(date('2026-10-17'));
    });

    it('moves a timed event by days and minutes', () => {
        const moved = moveEvent(meeting, { days: 1, minutes: -30 });

        expect(clock(moved.start)).toBe('2026-10-13T08:30');
        expect(clock(moved.end)).toBe('2026-10-13T10:00');
    });

    it('keeps the wall-clock time across a daylight-saving change', () => {
        const event = normalizeEvent(
            { id: 'd', start: '2026-10-31T09:00:00', end: '2026-10-31T10:00:00' },
            chicago,
        );
        const moved = moveEvent(event, { days: 1 });

        expect(clock(moved.start)).toBe('2026-11-01T09:00');
        expect((moved.start as Temporal.ZonedDateTime).offset).toBe('-06:00');
    });
});

describe('resizeEvent', () => {
    it('stretches or shrinks the end of an all-day event, keeping at least a day', () => {
        expect(resizeEvent(trip, 'end', { days: 2 }).end).toEqual(date('2026-10-16'));
        expect(resizeEvent(trip, 'end', { days: -5 }).end).toEqual(date('2026-10-12'));
    });

    it('moves the start of an all-day event without passing the end', () => {
        expect(resizeEvent(trip, 'start', { days: -1 }).start).toEqual(date('2026-10-11'));
        expect(resizeEvent(trip, 'start', { days: 9 }).start).toEqual(date('2026-10-14'));
    });

    it('keeps a timed event at least the minimum length', () => {
        expect(clock(resizeEvent(meeting, 'end', { minutes: 45 }).end)).toBe('2026-10-12T11:15');
        expect(clock(resizeEvent(meeting, 'end', { minutes: -200 }).end)).toBe('2026-10-12T09:15');
        expect(clock(resizeEvent(meeting, 'start', { minutes: 200 }).start)).toBe(
            '2026-10-12T10:15',
        );
    });
});

describe('withTimes', () => {
    it('recomputes the covered days for a preview', () => {
        const preview = withTimes(meeting, moveEvent(meeting, { days: 2 }));

        expect(preview.startDate).toEqual(date('2026-10-14'));
        expect(preview.endDate).toEqual(date('2026-10-14'));
        expect(preview.source).toBe(meeting.source);
    });

    it('does not count a midnight end as another day', () => {
        const preview = withTimes(meeting, resizeEvent(meeting, 'end', { minutes: 13 * 60 + 30 }));

        expect(preview.endDate).toEqual(date('2026-10-12'));
    });
});

describe('helpers', () => {
    it('snaps minutes to the step', () => {
        expect(snapMinutes(37, 15)).toBe(30);
        expect(snapMinutes(38, 15)).toBe(45);
    });

    it('orders a selection either way', () => {
        expect(orderedRange(date('2026-10-14'), date('2026-10-12'))).toEqual([
            date('2026-10-12'),
            date('2026-10-14'),
        ]);
        expect(orderedRange(90, 30)).toEqual([30, 90]);
    });
});
