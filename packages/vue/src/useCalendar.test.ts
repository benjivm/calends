import { effectScope, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCalendar } from './useCalendar.js';

describe('clock', () => {
    let current = Temporal.Instant.from('2026-11-12T10:00:45Z');

    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(Temporal.Now, 'instant').mockImplementation(() => current);
        vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockImplementation((zone) =>
            current.toZonedDateTimeISO(zone ?? 'UTC'),
        );
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    const advance = (ms: number) => {
        current = current.add({ milliseconds: ms });
        vi.advanceTimersByTime(ms);
    };

    it('ticks on the minute boundary, then every minute', () => {
        current = Temporal.Instant.from('2026-11-12T10:00:45Z');
        const scope = effectScope();
        const calendar = scope.run(() =>
            useCalendar({ date: ref(Temporal.PlainDate.from('2026-11-12')), timeZone: 'UTC' }),
        )!;

        advance(14_999);
        expect(calendar.now.value.toString()).toContain('T10:00:45');

        advance(1);
        expect(calendar.now.value.toString()).toContain('T10:01:00');

        advance(60_000);
        expect(calendar.now.value.toString()).toContain('T10:02:00');

        scope.stop();
        advance(60_000);
        expect(calendar.now.value.toString()).toContain('T10:02:00');
    });
});
