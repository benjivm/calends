import { h } from 'vue';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CalendarHeading from './CalendarHeading.vue';
import CalendarNav from './CalendarNav.vue';
import CalendarRoot from './CalendarRoot.vue';
import { date, TODAY } from './test-harness.js';

const navigation = (props: Record<string, unknown> = {}) => {
    const wrapper = mount(CalendarRoot, {
        attachTo: document.body,
        props: {
            date: date('2026-10-15'),
            today: TODAY,
            locale: 'en-US',
            ...props,
            'onUpdate:date': (value: Temporal.PlainDate) => wrapper.setProps({ date: value }),
        },
        slots: {
            default: () => [
                h(CalendarHeading),
                h(CalendarNav, { action: 'prev' }, () => 'Previous'),
                h(CalendarNav, { action: 'today' }, () => 'Today'),
                h(CalendarNav, { action: 'next' }, () => 'Next'),
            ],
        },
    });

    return wrapper;
};

const heading = (wrapper: ReturnType<typeof navigation>) => wrapper.get('h2').text();
const nav = (wrapper: ReturnType<typeof navigation>, action: string) =>
    wrapper.get(`[data-action="${action}"]`);

enableAutoUnmount(afterEach);

describe('CalendarRoot', () => {
    it('provides the calendar to its children', () => {
        const wrapper = navigation();

        expect(heading(wrapper)).toBe('October 2026');
        expect(wrapper.attributes('data-view')).toBe('month');
    });

    it('pages by the view with v-model:date', async () => {
        const wrapper = navigation();

        await nav(wrapper, 'next').trigger('click');
        expect(wrapper.emitted('update:date')?.at(-1)).toEqual([date('2026-11-15')]);
        expect(heading(wrapper)).toBe('November 2026');

        await wrapper.setProps({ view: 'week' });
        await nav(wrapper, 'prev').trigger('click');
        expect(wrapper.emitted('update:date')?.at(-1)).toEqual([date('2026-11-08')]);
        // Intl puts thin spaces around the range dash.
        expect(heading(wrapper)).toMatch(/^Nov 8\s–\s14, 2026$/);
    });

    it('returns to today, and marks the today button while the view shows it', async () => {
        const wrapper = navigation();

        expect(nav(wrapper, 'today').attributes('data-current')).toBe('');

        await nav(wrapper, 'next').trigger('click');
        expect(nav(wrapper, 'today').attributes('data-current')).toBeUndefined();

        await nav(wrapper, 'today').trigger('click');
        expect(wrapper.emitted('update:date')?.at(-1)).toEqual([TODAY]);
        expect(nav(wrapper, 'today').attributes('data-current')).toBe('');
    });

    it('follows a date changed by the parent', async () => {
        const wrapper = navigation();

        await wrapper.setProps({ date: date('2027-02-03') });

        expect(heading(wrapper)).toBe('February 2027');
    });

    it('renders nav controls as buttons that never submit a form', () => {
        const wrapper = navigation();

        expect(nav(wrapper, 'next').element.tagName).toBe('BUTTON');
        expect(nav(wrapper, 'next').attributes('type')).toBe('button');
    });

    it('keeps a polite live region for keyboard move announcements', () => {
        const wrapper = navigation();

        expect(wrapper.find('div[aria-live="polite"]').exists()).toBe(true);
    });

    it('names the missing root when a primitive is used outside one', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        expect(() => mount(CalendarHeading)).toThrow(
            '<CalendarHeading> must be used inside <CalendarRoot>.',
        );
    });
});
