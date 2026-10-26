import { ref, type Ref } from 'vue';
import type { GanttLinkInput } from '@calends/core';
import type { EventDropDetail, RangeSelectDetail } from '@calends/vue';

export interface DemoEvent {
    id: string;
    title: string;
    start: string;
    end?: string;
    /** Technician ids, for the resource and timeline demos. */
    techs?: string[];
}

export interface Technician {
    id: string;
    name: string;
}

const today = () => Temporal.Now.plainDateISO();

/** Sample events pinned to the current week, so the demos always have something to show. */
export function sampleEvents(): DemoEvent[] {
    const sunday = today().subtract({ days: today().dayOfWeek % 7 });
    const on = (day: number) => sunday.add({ days: day }).toString();
    const at = (day: number, time: string) => `${on(day)}T${time}`;

    return [
        { id: 'standup', title: 'Standup', start: at(1, '09:00'), end: at(1, '09:15') },
        { id: 'review', title: 'Design review', start: at(1, '10:00'), end: at(1, '11:30') },
        { id: 'install', title: 'Site install', start: at(1, '13:00'), end: at(1, '16:00') },
        { id: 'one-on-one', title: '1:1 with Sam', start: at(1, '14:00'), end: at(1, '14:30') },
        { id: 'vendor', title: 'Vendor call', start: at(1, '16:30'), end: at(1, '17:00') },
        { id: 'offsite', title: 'Team offsite', start: on(2), end: on(4) },
        { id: 'lunch', title: 'Lunch and learn', start: at(2, '12:00'), end: at(2, '13:00') },
        { id: 'retrofit', title: 'Overnight retrofit', start: at(3, '20:00'), end: at(4, '04:00') },
        { id: 'pto', title: 'PTO', start: on(5) },
        { id: 'launch', title: 'Launch week', start: on(6), end: on(10) },
        { id: 'planning', title: 'Sprint planning', start: at(8, '10:00'), end: at(8, '11:00') },
        { id: 'retro', title: 'Retro', start: at(-2, '15:00'), end: at(-2, '16:00') },
        { id: 'conference', title: 'Conference', start: on(-6), end: on(-4) },
    ];
}

export const technicians: Technician[] = [
    { id: 'avery', name: 'Avery Chen' },
    { id: 'jordan', name: 'Jordan Diaz' },
    { id: 'riley', name: 'Riley Park' },
    { id: 'sam', name: 'Sam Okafor' },
];

/** Field service jobs around today, with one double-booking and one unassigned job. */
export function sampleJobs(): DemoEvent[] {
    const on = (day: number) => today().add({ days: day }).toString();
    const at = (day: number, time: string) => `${on(day)}T${time}`;

    return [
        {
            id: 'kitchen',
            title: 'Kitchen install',
            start: at(0, '07:00'),
            end: at(0, '11:30'),
            techs: ['avery'],
        },
        {
            id: 'warranty',
            title: 'Warranty repair',
            start: at(0, '12:30'),
            end: at(0, '16:00'),
            techs: ['avery'],
        },
        {
            id: 'line',
            title: 'Line commissioning',
            start: at(0, '08:00'),
            end: at(0, '17:00'),
            techs: ['jordan', 'riley'],
        },
        {
            id: 'support',
            title: 'Remote support call',
            start: at(0, '10:00'),
            end: at(0, '11:00'),
            techs: ['riley'],
        },
        {
            id: 'retrofit',
            title: 'Overnight retrofit',
            start: at(0, '19:00'),
            end: at(1, '03:00'),
            techs: ['sam'],
        },
        { id: 'travel', title: 'Travel', start: on(1), techs: ['jordan'] },
        {
            id: 'training',
            title: 'Operator training',
            start: on(2),
            end: on(3),
            techs: ['avery', 'sam'],
        },
        {
            id: 'inspection',
            title: 'Safety inspection',
            start: at(2, '09:00'),
            end: at(2, '12:00'),
            techs: ['riley'],
        },
        {
            id: 'quote',
            title: 'Quote walkthrough',
            start: at(0, '13:00'),
            end: at(0, '14:00'),
            techs: [],
        },
    ];
}

/** Projects across a quarter. "Billing API" ends after "Web app rebuild" starts, so that link is a conflict. */
export function sampleProjects(): DemoEvent[] {
    const week = (offset: number) => today().add({ weeks: offset }).toString();

    return [
        { id: 'research', title: 'User research', start: week(-10), end: week(-6) },
        { id: 'design', title: 'Design system refresh', start: week(-6), end: week(-1) },
        { id: 'api', title: 'Billing API', start: week(-2), end: week(3) },
        { id: 'web', title: 'Web app rebuild', start: week(1), end: week(9) },
        { id: 'beta', title: 'Mobile beta', start: week(4), end: week(12) },
        { id: 'launch', title: 'Launch', start: week(12), end: week(13) },
    ];
}

export const projectLinks: GanttLinkInput[] = [
    { id: 'research-design', from: 'research', to: 'design' },
    { id: 'design-web', from: 'design', to: 'web', label: 'Specs' },
    { id: 'api-web', from: 'api', to: 'web' },
    { id: 'web-launch', from: 'web', to: 'launch' },
    { id: 'beta-launch', from: 'beta', to: 'launch' },
    { id: 'api-beta', from: 'api', to: 'beta', kind: 'related', label: 'Shares auth' },
];

/** Back to the wall-clock strings the samples are written in. */
const asInput = (value: Temporal.PlainDate | Temporal.ZonedDateTime) =>
    value instanceof Temporal.PlainDate
        ? value.toString()
        : value.toPlainDateTime().toString({ smallestUnit: 'minute' });

const describe = (value: Temporal.PlainDate | Temporal.ZonedDateTime) =>
    value instanceof Temporal.PlainDate
        ? value.toLocaleString(undefined, { month: 'short', day: 'numeric' })
        : value.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });

const technicianName = (id: string | number | null | undefined) =>
    id == null ? 'unassigned' : (technicians.find((tech) => tech.id === id)?.name ?? String(id));

/**
 * The calendar only reports what was dragged; the page commits it. Here that's local state, the
 * way an app would update its store or send a request.
 */
export function useDemoState(events: Ref<DemoEvent[]>, editable: Ref<boolean>, hint: string) {
    const status = ref(hint);

    function commit(label: string) {
        return (detail: EventDropDetail<DemoEvent>) => {
            const moved = 'resourceId' in detail;

            events.value = events.value.map((item) => {
                if (item.id !== detail.event.id) return item;

                // A job can have several technicians: swap the row it left for the row it landed in.
                const techs = moved
                    ? [
                          ...(item.techs ?? []).filter(
                              (tech) => tech !== detail.previousResourceId,
                          ),
                          ...(detail.resourceId == null ? [] : [String(detail.resourceId)]),
                      ]
                    : item.techs;

                return { ...item, start: asInput(detail.start), end: asInput(detail.end), techs };
            });

            status.value = `${label} "${detail.event.title}": ${describe(detail.start)} – ${describe(detail.end)}${moved ? `, to ${technicianName(detail.resourceId)}` : ''}`;
        };
    }

    let created = 0;

    /** A selection is always reported; turning it into a new event is an edit, so only when editable. */
    function create(range: RangeSelectDetail) {
        const row = range.resourceId === undefined ? '' : `, ${technicianName(range.resourceId)}`;

        status.value = `Selected ${describe(range.start)} – ${describe(range.end)}${row}`;

        if (!editable.value) return;

        created += 1;
        events.value = [
            ...events.value,
            {
                id: `new-${created}`,
                title: `New event ${created}`,
                start: asInput(range.start),
                end: asInput(range.end),
                techs: range.resourceId == null ? [] : [String(range.resourceId)],
            },
        ];
        status.value += `, added "New event ${created}"`;
    }

    return { status, onDrop: commit('Moved'), onResize: commit('Resized'), onSelect: create };
}
