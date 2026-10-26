import { ref, type Ref } from 'vue';
import type { EventDropDetail, RangeSelectDetail } from '@calends/vue';

export interface DemoEvent {
    id: string;
    title: string;
    start: string;
    end?: string;
}

/** Sample events pinned to the current week, so the demos always have something to show. */
export function sampleEvents(): DemoEvent[] {
    const today = Temporal.Now.plainDateISO();
    const sunday = today.subtract({ days: today.dayOfWeek % 7 });
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

/** Back to the wall-clock strings the samples are written in. */
const asInput = (value: Temporal.PlainDate | Temporal.ZonedDateTime) =>
    value instanceof Temporal.PlainDate
        ? value.toString()
        : value.toPlainDateTime().toString({ smallestUnit: 'minute' });

const describe = (value: Temporal.PlainDate | Temporal.ZonedDateTime) =>
    value instanceof Temporal.PlainDate
        ? value.toLocaleString(undefined, { month: 'short', day: 'numeric' })
        : value.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * The calendar only reports what was dragged; the page commits it. Here that's local state, the
 * way an app would update its store or send a request.
 */
export function useDemoState(events: Ref<DemoEvent[]>, editable: Ref<boolean>) {
    const status = ref('Drag an event, stretch its edge, or click or drag across empty days.');

    function commit(label: string) {
        return (detail: EventDropDetail<DemoEvent>) => {
            events.value = events.value.map((item) =>
                item.id === detail.event.id
                    ? { ...item, start: asInput(detail.start), end: asInput(detail.end) }
                    : item,
            );
            status.value = `${label} "${detail.event.title}": ${describe(detail.start)} – ${describe(detail.end)}`;
        };
    }

    let created = 0;

    /** A selection is always reported; turning it into a new event is an edit, so only when editable. */
    function create(range: RangeSelectDetail) {
        status.value = `Selected ${describe(range.start)} – ${describe(range.end)}`;

        if (!editable.value) return;

        created += 1;
        events.value = [
            ...events.value,
            {
                id: `new-${created}`,
                title: `New event ${created}`,
                start: asInput(range.start),
                end: asInput(range.end),
            },
        ];
        status.value += `, added "New event ${created}"`;
    }

    return { status, onDrop: commit('Moved'), onResize: commit('Resized'), onSelect: create };
}
