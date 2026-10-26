import { describe, expect, it } from 'vitest';
import { isSamePeriod, navigate, periodRange, periodTitle } from './navigation.js';

const date = (value: string) => Temporal.PlainDate.from(value);

describe('navigation', () => {
    it('pages by the view period', () => {
        expect(navigate(date('2026-10-31'), 'month', 1)).toEqual(date('2026-11-30'));
        expect(navigate(date('2026-10-15'), 'week', -1)).toEqual(date('2026-10-08'));
        expect(navigate(date('2026-10-15'), 'day', 1)).toEqual(date('2026-10-16'));
    });

    it('gives the unpadded range of a period', () => {
        expect(periodRange(date('2026-10-15'), 'month')).toEqual({
            start: date('2026-10-01'),
            end: date('2026-10-31'),
        });
        expect(periodRange(date('2026-10-15'), 'week', 1)).toEqual({
            start: date('2026-10-12'),
            end: date('2026-10-18'),
        });
    });

    it('compares weeks by their first day', () => {
        expect(isSamePeriod(date('2026-10-11'), date('2026-10-17'), 'week')).toBe(true);
        expect(isSamePeriod(date('2026-10-11'), date('2026-10-17'), 'week', 1)).toBe(false);
    });

    it('titles a week as a date range', () => {
        // Intl separates the range with thin spaces.
        expect(periodTitle(date('2026-10-15'), 'week', 7, 'en-US').replace(/\s/g, ' ')).toBe(
            'Oct 11 – 17, 2026',
        );
        expect(periodTitle(date('2026-10-15'), 'month', 7, 'en-US')).toBe('October 2026');
    });
});
