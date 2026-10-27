import { h } from 'vue';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CalendarHeading from './CalendarHeading.vue';
import CalendarNav from './CalendarNav.vue';
import CalendarRoot from './CalendarRoot.vue';
import { date, eventElement, mountWeek, TODAY } from './test-harness.js';

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

    it('starts on today when no date is bound', () => {
        const wrapper = navigation({ date: undefined, today: date('2027-02-03') });

        expect(heading(wrapper)).toBe('February 2027');
    });

    it('takes today from now, in the calendar time zone', () => {
        const wrapper = navigation({
            date: undefined,
            today: undefined,
            timeZone: 'America/New_York',
            now: Temporal.ZonedDateTime.from('2027-05-31T23:30[America/Chicago]'),
        });

        expect(heading(wrapper)).toBe('June 2027');
    });

    it('marks timed events past against now, so server and client agree', () => {
        const wrapper = mountWeek({
            today: undefined,
            now: Temporal.ZonedDateTime.from('2026-10-14T12:00[America/Chicago]'),
            events: [
                {
                    id: 'morning',
                    title: 'Morning',
                    start: '2026-10-14T09:00',
                    end: '2026-10-14T10:00',
                },
                {
                    id: 'afternoon',
                    title: 'Afternoon',
                    start: '2026-10-14T13:00',
                    end: '2026-10-14T14:00',
                },
            ],
        });

        expect(eventElement(wrapper, 'morning').hasAttribute('data-past')).toBe(true);
        expect(eventElement(wrapper, 'afternoon').hasAttribute('data-past')).toBe(false);
    });

    it('places timed events as percentages of the window, beside the minutes', () => {
        const wrapper = mountWeek({
            slotMinMinutes: 8 * 60,
            slotMaxMinutes: 18 * 60,
            events: [
                {
                    id: 'review',
                    title: 'Review',
                    start: '2026-10-14T09:00',
                    end: '2026-10-14T10:30',
                },
            ],
        });
        const { style } = eventElement(wrapper, 'review');

        expect(style.getPropertyValue('--event-offset')).toBe('10%');
        expect(style.getPropertyValue('--event-length')).toBe('15%');
        expect(style.getPropertyValue('--event-start')).toBe('60');
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
