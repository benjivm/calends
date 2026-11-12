import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertTemporal, toZonedDateTime } from './dates.js';

afterEach(() => vi.unstubAllGlobals());

describe('assertTemporal', () => {
    it('passes where Temporal exists', () => {
        expect(() => assertTemporal()).not.toThrow();
    });

    it('points at the polyfill docs where it is missing', () => {
        vi.stubGlobal('Temporal', undefined);

        expect(() => assertTemporal()).toThrow(/Load a polyfill/);
    });
});

describe('toZonedDateTime', () => {
    const zone = 'America/Chicago';

    it('reads a space-separated time with Z as an instant', () => {
        expect(toZonedDateTime('2026-11-02 09:00Z', zone).toString()).toBe(
            '2026-11-02T03:00:00-06:00[America/Chicago]',
        );
    });

    it('reads a space-separated time with an offset as an instant', () => {
        expect(toZonedDateTime('2026-11-02 09:00-05:00', zone).toString()).toBe(
            '2026-11-02T08:00:00-06:00[America/Chicago]',
        );
    });

    it('reads a space-separated time without an offset as wall-clock', () => {
        expect(toZonedDateTime('2026-11-02 09:00', zone).toString()).toBe(
            '2026-11-02T09:00:00-06:00[America/Chicago]',
        );
    });
});
