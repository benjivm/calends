import { h, nextTick } from 'vue';
import type {
    CalendarEventInput,
    CalendarResource,
    MonthWeek as MonthWeekData,
    ResourceRow as ResourceRowData,
    TimeGridDay,
} from '@calends/core';
import { mount } from '@vue/test-utils';
import CalendarHeading from './CalendarHeading.vue';
import CalendarRoot from './CalendarRoot.vue';
import EventBar from './EventBar.vue';
import EventResizeHandle from './EventResizeHandle.vue';
import MonthDay from './MonthDay.vue';
import MonthDayMore from './MonthDayMore.vue';
import MonthGrid from './MonthGrid.vue';
import MonthWeek from './MonthWeek.vue';
import ResourceCell from './ResourceCell.vue';
import ResourceGrid from './ResourceGrid.vue';
import ResourceRow from './ResourceRow.vue';
import TimeColumn from './TimeColumn.vue';
import TimeEvent from './TimeEvent.vue';
import TimeGrid from './TimeGrid.vue';

export interface TestEvent extends CalendarEventInput {
    title: string;
    resourceIds?: string[];
}

export const date = (value: string) => Temporal.PlainDate.from(value);

/** Wednesday, October 14, 2026; the month grid runs Sunday Sep 27 to Saturday Oct 31. */
export const TODAY = date('2026-10-14');

type RootProps = Record<string, unknown>;

/**
 * Mounts `CalendarRoot` around `content`, attached to the document so focus works, with
 * `v-model:date` wired up and the emitted intents collected.
 */
function mountCalendar(props: RootProps, content: () => unknown) {
    const wrapper = mount(CalendarRoot, {
        attachTo: document.body,
        props: {
            date: TODAY,
            today: TODAY,
            timeZone: 'America/Chicago',
            locale: 'en-US',
            ...props,
            'onUpdate:date': (value: Temporal.PlainDate) => wrapper.setProps({ date: value }),
        },
        slots: { default: content },
    });

    return wrapper;
}

/** The title is a focusable button so keyboard tests can pick the event up. */
const eventContent = (event: { source: CalendarEventInput }) =>
    h('button', { type: 'button' }, (event.source as TestEvent).title);

export function mountMonth(props: RootProps = {}) {
    return mountCalendar(props, () => [
        h(CalendarHeading),
        h(MonthGrid, null, {
            default: ({ weeks }: { weeks: MonthWeekData[] }) =>
                weeks.map((week) =>
                    h(
                        MonthWeek,
                        { key: week.start.toString(), week },
                        {
                            default: () =>
                                week.days.map((day) =>
                                    h(
                                        MonthDay,
                                        { key: day.date.toString(), day },
                                        {
                                            default: () => [
                                                ...day.segments.map((segment) =>
                                                    h(
                                                        EventBar,
                                                        { key: segment.event.id, segment },
                                                        {
                                                            default: () => [
                                                                eventContent(segment.event),
                                                                h(EventResizeHandle, {
                                                                    edge: 'end',
                                                                }),
                                                            ],
                                                        },
                                                    ),
                                                ),
                                                h(MonthDayMore, { day }),
                                            ],
                                        },
                                    ),
                                ),
                        },
                    ),
                ),
        }),
    ]);
}

export function mountWeek(props: RootProps = {}) {
    return mountCalendar({ view: 'week', ...props }, () =>
        h(TimeGrid, null, {
            default: ({ days }: { days: TimeGridDay[] }) =>
                days.map((day) =>
                    h(
                        TimeColumn,
                        { key: day.date.toString(), day },
                        {
                            default: () =>
                                day.events.map((layout) =>
                                    h(
                                        TimeEvent,
                                        { key: layout.event.id, layout },
                                        { default: () => eventContent(layout.event) },
                                    ),
                                ),
                        },
                    ),
                ),
        }),
    );
}

export const RESOURCES: CalendarResource[] = [{ id: 'ana' }, { id: 'bo' }];

export function mountResources(props: RootProps = {}) {
    const resourceOrder = RESOURCES.map((resource) => resource.id);

    return mountCalendar(
        {
            view: 'week',
            resources: RESOURCES,
            getResourceIds: (event: TestEvent) => event.resourceIds,
            ...props,
        },
        () =>
            h(ResourceGrid, null, {
                default: ({ rows }: { rows: ResourceRowData[] }) =>
                    rows.map((row, rowIndex) => {
                        const resourceId = row.resource?.id ?? null;

                        return h(
                            ResourceRow,
                            { key: String(resourceId), row },
                            {
                                default: () =>
                                    row.cells.map((cell) =>
                                        h(
                                            ResourceCell,
                                            {
                                                key: cell.date.toString(),
                                                cell,
                                                rowIndex,
                                                resourceId,
                                            },
                                            {
                                                default: () =>
                                                    cell.segments.map((segment) =>
                                                        h(
                                                            EventBar,
                                                            {
                                                                key: segment.event.id,
                                                                segment,
                                                                resourceId,
                                                                keyboardAxes: {
                                                                    horizontal: 'day',
                                                                    vertical: 'resource',
                                                                    resourceOrder,
                                                                },
                                                            },
                                                            {
                                                                default: () =>
                                                                    eventContent(segment.event),
                                                            },
                                                        ),
                                                    ),
                                            },
                                        ),
                                    ),
                            },
                        );
                    }),
            }),
    );
}

export type CalendarWrapper = ReturnType<typeof mountMonth>;

/** Gridcell for a date (and resource row), found through the attributes drops resolve from. */
export function cell(wrapper: CalendarWrapper, value: string, row?: number): HTMLElement {
    const rowSelector = row === undefined ? '' : `[data-row="${row}"]`;

    return wrapper.get<HTMLElement>(`[role="gridcell"][data-date="${value}"]${rowSelector}`)
        .element;
}

export function eventElement(wrapper: CalendarWrapper, id: string | number): HTMLElement {
    return wrapper.get<HTMLElement>(`[data-event-id="${id}"]`).element;
}

/**
 * happy-dom has no layout, so `document.elementsFromPoint` doesn't exist. Tests say what's under
 * the pointer instead; `resolveTarget` reads the drop attributes from there.
 */
let underPointer: Element[] = [];

export function pointerOver(...elements: Element[]) {
    underPointer = elements;
}

export function installPointerStub() {
    underPointer = [];
    document.elementsFromPoint = () => underPointer;
}

/** Gives a time column a layout: one pixel per minute from the top, so `clientY` is minutes. */
export function layOutMinutes(element: Element) {
    element.getBoundingClientRect = () =>
        ({ top: 0, left: 0, right: 100, bottom: 1440, width: 100, height: 1440 }) as DOMRect;
}

export function pointer(type: string, init: PointerEventInit = {}) {
    return new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        pointerType: 'mouse',
        ...init,
    });
}

/** Keys after pick-up are read on the window while the event is held. */
export async function pressOnWindow(key: string, init: KeyboardEventInit = {}) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
    await nextTick();
    await nextTick();
}

export function announcement(wrapper: CalendarWrapper): string {
    return wrapper.get('[aria-live="polite"]:not(h2)').text();
}
