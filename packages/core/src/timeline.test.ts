import { describe, expect, it } from 'vitest';
import { normalizeEvents, type CalendarEventInput } from './events.js';
import { createTimeline } from './timeline.js';

const date = (value: string) => Temporal.PlainDate.from(value);

type Job = CalendarEventInput & { techs?: string[] };

const timeline = (jobs: Job[], options = {}) =>
    createTimeline({
        start: date('2026-10-12'),
        end: date('2026-10-13'),
        events: normalizeEvents(jobs, { timeZone: 'America/Chicago' }),
        today: date('2026-10-12'),
        ...options,
    });

const offsets = (row: {
    items: {
        event: { id: string | number };
        startOffset: number;
        endOffset: number;
        lane: number;
    }[];
}) => row.items.map((item) => [item.event.id, item.startOffset, item.endOffset, item.lane]);

describe('createTimeline', () => {
    it('puts every event in one row when there are no resources', () => {
        const { rows, axisMinutes, days } = timeline([
            { id: 'a', start: '2026-10-12T09:00:00', end: '2026-10-12T10:30:00' },
            { id: 'b', start: '2026-10-13T08:00:00', end: '2026-10-13T09:00:00' },
        ]);

        expect(rows).toHaveLength(1);
        expect(offsets(rows[0])).toEqual([
            ['a', 540, 630, 0],
            ['b', 1920, 1980, 0],
        ]);
        expect(axisMinutes).toBe(2880);
        expect(days[1].offset).toBe(1440);
        expect(days[0].slots).toHaveLength(24);
    });

    it('stacks overlapping events and reuses a lane once it frees up', () => {
        const { rows } = timeline([
            { id: 'a', start: '2026-10-12T09:00:00', end: '2026-10-12T11:00:00' },
            { id: 'b', start: '2026-10-12T10:00:00', end: '2026-10-12T12:00:00' },
            { id: 'c', start: '2026-10-12T11:00:00', end: '2026-10-12T13:00:00' },
        ]);

        expect(offsets(rows[0]).map(([id, , , lane]) => [id, lane])).toEqual([
            ['a', 0],
            ['b', 1],
            ['c', 0],
        ]);
    });

    it('draws an overnight job as one continuous bar', () => {
        const { rows } = timeline([
            { id: 'a', start: '2026-10-12T22:00:00', end: '2026-10-13T02:00:00' },
        ]);

        expect(offsets(rows[0])).toEqual([['a', 1320, 1560, 0]]);
    });

    it('skips the hours outside the window, so days join edge to edge', () => {
        const { rows, axisMinutes, days } = timeline(
            [
                { id: 'span', start: '2026-10-12T16:00:00', end: '2026-10-13T09:00:00' },
                { id: 'evening', start: '2026-10-12T19:00:00', end: '2026-10-12T21:00:00' },
            ],
            { slotMinMinutes: 7 * 60, slotMaxMinutes: 18 * 60 },
        );

        expect(axisMinutes).toBe(2 * 11 * 60);
        expect(days[0].slots[0]).toBe(7 * 60);
        expect(offsets(rows[0])).toEqual([['span', 540, 660 + 120, 0]]);
    });

    it('covers whole day windows with all-day events and clips at the range edges', () => {
        const { rows } = timeline([
            { id: 'trip', start: '2026-10-10', end: '2026-10-12' },
            { id: 'late', start: '2026-10-13T23:00:00', end: '2026-10-14T03:00:00' },
        ]);

        expect(rows[0].items).toMatchObject([
            { event: { id: 'trip' }, startOffset: 0, endOffset: 1440, startsBefore: true },
            { event: { id: 'late' }, startOffset: 2820, endOffset: 2880, endsAfter: true },
        ]);
    });

    it('splits events into resource rows, with an unassigned row for the rest', () => {
        const { rows } = timeline(
            [
                {
                    id: 'a',
                    start: '2026-10-12T09:00:00',
                    end: '2026-10-12T10:00:00',
                    techs: ['ann', 'bob'],
                },
                { id: 'b', start: '2026-10-12T09:00:00', end: '2026-10-12T10:00:00', techs: [] },
            ],
            {
                resources: [{ id: 'ann' }, { id: 'bob' }, { id: 'cy' }],
                getResourceIds: (job: Job) => job.techs,
                unassigned: true,
            },
        );

        expect(
            rows.map((row) => [row.resource?.id ?? null, row.items.map((item) => item.event.id)]),
        ).toEqual([
            ['ann', ['a']],
            ['bob', ['a']],
            ['cy', []],
            [null, ['b']],
        ]);
    });
});
