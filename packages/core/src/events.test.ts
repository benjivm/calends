import { describe, expect, it } from 'vitest';
import { normalizeEvent } from './events.js';

const chicago = { timeZone: 'America/Chicago' };
const date = (value: string) => Temporal.PlainDate.from(value);

describe('normalizeEvent', () => {
    it('treats date-only events as all-day with an inclusive end', () => {
        const event = normalizeEvent({ id: 1, start: '2026-10-05', end: '2026-10-07' }, chicago);

        expect(event.allDay).toBe(true);
        expect(event.startDate).toEqual(date('2026-10-05'));
        expect(event.endDate).toEqual(date('2026-10-07'));
    });

    it('defaults a missing end to the start day', () => {
        const event = normalizeEvent({ id: 1, start: '2026-10-05' }, chicago);

        expect(event.endDate).toEqual(date('2026-10-05'));
    });

    it('clamps an end before the start', () => {
        const event = normalizeEvent({ id: 1, start: '2026-10-05', end: '2026-10-01' }, chicago);

        expect(event.endDate).toEqual(date('2026-10-05'));
    });

    it('moves instants into the calendar time zone before taking the date', () => {
        const event = normalizeEvent(
            { id: 1, start: '2026-03-08T05:30:00Z', end: '2026-03-08T09:00:00Z' },
            chicago,
        );

        expect(event.allDay).toBe(false);
        expect(event.startDate).toEqual(date('2026-03-07'));
        expect(event.endDate).toEqual(date('2026-03-08'));
    });

    it('reads offset-less times as wall-clock times in the calendar zone', () => {
        const event = normalizeEvent({ id: 1, start: '2026-10-05T23:30:00' }, chicago);

        expect(event.startDate).toEqual(date('2026-10-05'));
    });

    it('does not spill an event ending at midnight into the next day', () => {
        const event = normalizeEvent(
            { id: 1, start: '2026-10-05T09:00:00', end: '2026-10-06T00:00:00' },
            chicago,
        );

        expect(event.endDate).toEqual(date('2026-10-05'));
    });

    it('handles the 25-hour day when daylight saving ends', () => {
        const event = normalizeEvent(
            { id: 1, start: '2026-11-01T00:30:00', end: '2026-11-02T00:00:00' },
            chicago,
        );

        expect(event.start.toString()).toContain('-05:00');
        expect(event.endDate).toEqual(date('2026-11-01'));
    });

    it('keeps zero-length timed events on their day', () => {
        const event = normalizeEvent({ id: 1, start: '2026-10-05T00:00:00' }, chicago);

        expect(event.startDate).toEqual(date('2026-10-05'));
        expect(event.endDate).toEqual(date('2026-10-05'));
    });

    it('accepts Date objects', () => {
        const event = normalizeEvent({ id: 1, start: new Date('2026-10-05T15:00:00Z') }, chicago);

        expect(event.allDay).toBe(false);
        expect(event.startDate).toEqual(date('2026-10-05'));
    });
});
