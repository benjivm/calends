import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertTemporal } from './dates.js';

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
