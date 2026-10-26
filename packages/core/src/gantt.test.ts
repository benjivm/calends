import { describe, expect, it } from 'vitest';
import { normalizeEvents, type CalendarEventInput } from './events.js';
import { createGantt } from './gantt.js';

const date = (value: string) => Temporal.PlainDate.from(value);
const tasks = (inputs: CalendarEventInput[]) =>
    normalizeEvents(inputs, { timeZone: 'America/Chicago' });

const projects = tasks([
    { id: 'b', start: '2026-10-20', end: '2026-11-04' },
    { id: 'a', start: '2026-09-02', end: '2026-10-09' },
]);

describe('createGantt', () => {
    it('fits the axis to the tasks, padded and snapped to whole weeks', () => {
        const gantt = createGantt({ events: projects, scale: 'week', today: date('2026-10-25') });

        // Two weeks before Sep 2 is Aug 19, back to Sunday Aug 16; two weeks after Nov 4 ends Saturday Nov 21.
        expect(gantt.start).toEqual(date('2026-08-16'));
        expect(gantt.end).toEqual(date('2026-11-21'));
        expect(gantt.axisDays).toBe(98);
        expect(gantt.columns).toHaveLength(14);
        expect(gantt.columns.every((column) => column.days === 7)).toBe(true);
    });

    it('keeps one row per task in the order given', () => {
        const gantt = createGantt({ events: projects, scale: 'week', today: date('2026-10-25') });

        expect(gantt.rows.map((row) => [row.event.id, row.startOffset, row.endOffset])).toEqual([
            ['b', 65, 81],
            ['a', 17, 55],
        ]);
    });

    it('snaps month scale to whole months with years above', () => {
        const gantt = createGantt({ events: projects, scale: 'month', today: date('2026-10-25') });

        expect(gantt.start).toEqual(date('2026-08-01'));
        expect(gantt.end).toEqual(date('2026-12-31'));
        expect(gantt.columns.map((column) => column.days)).toEqual([31, 30, 31, 30, 31]);
        expect(gantt.groups).toHaveLength(1);
    });

    it('lays out days with weekends and today, and months above', () => {
        const gantt = createGantt({
            events: tasks([{ id: 'a', start: '2026-10-28', end: '2026-10-30' }]),
            scale: 'day',
            today: date('2026-10-25'),
        });

        expect(gantt.start).toEqual(date('2026-10-21'));
        expect(gantt.end).toEqual(date('2026-11-06'));
        expect(gantt.columns.find((column) => column.isToday)?.start).toEqual(date('2026-10-25'));
        expect(gantt.columns.filter((column) => column.isWeekend)).toHaveLength(4);
        expect(gantt.groups.map((group) => group.days)).toEqual([11, 6]);
        expect(gantt.todayOffset).toBe(4);
    });

    it('clips tasks to an explicit range and marks today off the axis', () => {
        const gantt = createGantt({
            events: projects,
            start: date('2026-10-01'),
            end: date('2026-10-31'),
            today: date('2026-12-01'),
        });

        expect(gantt.rows[0]).toMatchObject({
            startOffset: 19,
            endOffset: 31,
            continuesAfter: true,
        });
        expect(gantt.rows[1]).toMatchObject({
            startOffset: 0,
            endOffset: 9,
            continuesBefore: true,
        });
        expect(gantt.todayOffset).toBeNull();
    });

    it('fits the range to rangeEvents so a dragged preview does not move the axis', () => {
        const dragged = tasks([{ id: 'a', start: '2027-03-01', end: '2027-03-05' }]);
        const gantt = createGantt({
            events: dragged,
            rangeEvents: projects,
            today: date('2026-10-25'),
        });

        expect(gantt.start).toEqual(date('2026-08-16'));
        expect(gantt.rows[0]).toMatchObject({ endOffset: gantt.axisDays, continuesAfter: true });
    });
});
