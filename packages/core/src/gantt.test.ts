import { describe, expect, it } from 'vitest';
import { normalizeEvents, type CalendarEventInput } from './events.js';
import { createGantt, routeGanttLink } from './gantt.js';

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

describe('gantt links', () => {
    it('resolves links with their label, drops unknown ends, and flags conflicts', () => {
        const gantt = createGantt({
            events: projects,
            today: date('2026-10-25'),
            links: [
                { id: 1, from: 'a', to: 'b', label: 'blocks' },
                { id: 2, from: 'b', to: 'a' },
                { id: 3, from: 'a', to: 'missing' },
            ],
        });

        expect(gantt.links.map((link) => [link.id, link.label, link.conflict])).toEqual([
            [1, 'blocks', false],
            [2, undefined, true],
        ]);
    });

    it('draws a related link from whichever row starts first', () => {
        const gantt = createGantt({
            events: projects,
            today: date('2026-10-25'),
            links: [{ id: 1, from: 'b', to: 'a', kind: 'related' }],
        });

        expect([gantt.links[0].from.event.id, gantt.links[0].to.event.id]).toEqual(['a', 'b']);
    });
});

describe('routeGanttLink', () => {
    const bar = (left: number, right: number, top: number) => ({
        left,
        right,
        top,
        bottom: top + 20,
    });

    it('drops from the bottom edge near the end, never out of the end past a side label', () => {
        const points = routeGanttLink(bar(0, 100, 0), bar(200, 300, 100), { gutterY: 30 });

        expect(points).toEqual([
            { x: 88, y: 20 },
            { x: 88, y: 110 },
            { x: 200, y: 110 },
        ]);
    });

    it('leaves through the top edge when the successor is above', () => {
        const points = routeGanttLink(bar(0, 100, 100), bar(200, 300, 0), { gutterY: 90 });

        expect(points[0]).toEqual({ x: 88, y: 100 });
        expect(points[1]).toEqual({ x: 88, y: 10 });
    });

    it('drops early enough to turn into a successor that starts inside the bar', () => {
        const points = routeGanttLink(bar(0, 100, 0), bar(50, 150, 100), { gutterY: 30 });

        expect(points[0]).toEqual({ x: 38, y: 20 });
    });

    it('drops from the middle of a narrow bar into a successor right after it', () => {
        const points = routeGanttLink(bar(0, 8, 0), bar(12, 40, 100), { gutterY: 30 });

        expect(points).toEqual([
            { x: 4, y: 20 },
            { x: 4, y: 110 },
            { x: 12, y: 110 },
        ]);
    });

    it('runs along the gutter when the successor starts before there is room to turn', () => {
        const points = routeGanttLink(bar(100, 200, 0), bar(50, 150, 100), { gutterY: 30 });

        expect(points).toEqual([
            { x: 112, y: 20 },
            { x: 112, y: 30 },
            { x: 38, y: 30 },
            { x: 38, y: 110 },
            { x: 50, y: 110 },
        ]);
    });
});
