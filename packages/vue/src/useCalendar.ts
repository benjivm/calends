import {
    computed,
    inject,
    onScopeDispose,
    provide,
    ref,
    toValue,
    type InjectionKey,
    type MaybeRefOrGetter,
    type Ref,
} from 'vue';
import {
    assertTemporal,
    createGantt,
    createMonthGrid,
    createResourceGrid,
    createTimeGrid,
    createTimeline,
    isSamePeriod,
    localTimeZone,
    navigate,
    normalizeEvents,
    periodRange,
    periodTitle,
    type CalendarEventInput,
    type CalendarResource,
    type CalendarView,
    type GanttLinkInput,
    type GanttScale,
    type ResourceId,
    type WeekDay,
} from '@calends/core';
import {
    useInteractions,
    type EventDropDetail,
    type RangeSelectDetail,
} from './useInteractions.js';

export interface UseCalendarOptions<T extends CalendarEventInput> {
    date: Ref<Temporal.PlainDate>;
    events?: MaybeRefOrGetter<readonly T[]>;
    view?: MaybeRefOrGetter<CalendarView>;
    weekStartsOn?: MaybeRefOrGetter<WeekDay>;
    timeZone?: MaybeRefOrGetter<string | undefined>;
    locale?: MaybeRefOrGetter<string | undefined>;
    fixedWeeks?: MaybeRefOrGetter<boolean>;
    maxLanes?: MaybeRefOrGetter<number | undefined>;
    today?: MaybeRefOrGetter<Temporal.PlainDate | undefined>;
    /** Overrides the clock. Pass the same value on the server and the client to hydrate cleanly. */
    now?: MaybeRefOrGetter<Temporal.ZonedDateTime | undefined>;
    resources?: MaybeRefOrGetter<readonly CalendarResource[] | undefined>;
    getResourceIds?: (event: T) => readonly ResourceId[] | null | undefined;
    unassigned?: MaybeRefOrGetter<boolean | undefined>;
    /** The time grid's daily window, in minutes from midnight. */
    slotMinMinutes?: MaybeRefOrGetter<number | undefined>;
    slotMaxMinutes?: MaybeRefOrGetter<number | undefined>;
    /** Minutes per timeline header slot. */
    slotMinutes?: MaybeRefOrGetter<number | undefined>;
    /** Column width of the Gantt view. */
    ganttScale?: MaybeRefOrGetter<GanttScale | undefined>;
    /** Lines between Gantt rows, by event id. */
    ganttLinks?: MaybeRefOrGetter<readonly GanttLinkInput[] | undefined>;
    /** Lets events be moved and resized; the calendar reports the change and the app commits it. */
    editable?: MaybeRefOrGetter<boolean | undefined>;
    /** Lets people drag across empty cells or hours to select a range. */
    selectable?: MaybeRefOrGetter<boolean | undefined>;
    /** Minutes timed drags and selections snap to. */
    snapMinutes?: MaybeRefOrGetter<number | undefined>;
    canEdit?: (event: T) => boolean;
    onEventDrop?: (detail: EventDropDetail<T>) => void;
    onEventResize?: (detail: EventDropDetail<T>) => void;
    onRangeSelect?: (detail: RangeSelectDetail) => void;
}

export function useCalendar<T extends CalendarEventInput>(options: UseCalendarOptions<T>) {
    assertTemporal();

    const { date } = options;
    const view = computed(() => toValue(options.view) ?? 'month');
    const weekStartsOn = computed(() => toValue(options.weekStartsOn) ?? 7);
    const timeZone = computed(() => toValue(options.timeZone) ?? localTimeZone());
    const locale = computed(() => toValue(options.locale));
    const clock = ref(Temporal.Now.zonedDateTimeISO(timeZone.value)) as Ref<Temporal.ZonedDateTime>;
    const now = computed(() => toValue(options.now) ?? clock.value);

    // SSR never disposes component scopes, so a server-side interval would leak per render.
    if (typeof window !== 'undefined') {
        const ticker = setInterval(() => {
            if (toValue(options.now) === undefined) {
                clock.value = Temporal.Now.zonedDateTimeISO(timeZone.value);
            }
        }, 60_000);

        onScopeDispose(() => clearInterval(ticker));
    }

    const today = computed(
        () => toValue(options.today) ?? now.value.withTimeZone(timeZone.value).toPlainDate(),
    );
    const focusedDate = ref(date.value) as Ref<Temporal.PlainDate>;
    /** The event under the pointer or focus, so every segment of it can highlight together. */
    const highlightedEventId = ref<string | number | null>(null);

    const events = computed(() =>
        normalizeEvents(toValue(options.events) ?? [], { timeZone: timeZone.value }),
    );

    /** The period's own days; the month grid pads these out to whole weeks. */
    const range = computed(() => periodRange(date.value, view.value, weekStartsOn.value));

    const interactions = useInteractions<T>({
        events,
        resources: options.resources,
        getResourceIds: options.getResourceIds,
        timeZone,
        locale,
        rangeStart: computed(() => range.value.start),
        slotMinMinutes: options.slotMinMinutes,
        slotMaxMinutes: options.slotMaxMinutes,
        editable: options.editable,
        selectable: options.selectable,
        snapMinutes: options.snapMinutes,
        canEdit: options.canEdit,
        onEventDrop: options.onEventDrop,
        onEventResize: options.onEventResize,
        onRangeSelect: options.onRangeSelect,
    });

    const resources = computed(() => toValue(options.resources));
    const displayEvents = interactions.displayEvents;
    const displayResourceIds = (event: T) => interactions.displayResourceIds(event);

    const grid = computed(() =>
        createMonthGrid({
            date: date.value,
            events: displayEvents.value,
            weekStartsOn: weekStartsOn.value,
            fixedWeeks: toValue(options.fixedWeeks) ?? false,
            maxLanes: toValue(options.maxLanes),
            today: today.value,
        }),
    );

    const resourceGrid = computed(() =>
        createResourceGrid({
            ...range.value,
            resources: toValue(options.resources) ?? [],
            events: displayEvents.value,
            getResourceIds: displayResourceIds,
            unassigned: toValue(options.unassigned) ?? false,
            today: today.value,
        }),
    );

    const timeGrid = computed(() =>
        createTimeGrid({
            ...range.value,
            events: displayEvents.value,
            slotMinMinutes: toValue(options.slotMinMinutes) ?? 0,
            slotMaxMinutes: toValue(options.slotMaxMinutes) ?? 24 * 60,
            today: today.value,
        }),
    );

    /** Without `resources`, the timeline is a single row of every event. */
    const timeline = computed(() =>
        createTimeline({
            ...range.value,
            events: displayEvents.value,
            resources: resources.value,
            getResourceIds: displayResourceIds,
            unassigned: toValue(options.unassigned) ?? false,
            slotMinMinutes: toValue(options.slotMinMinutes) ?? 0,
            slotMaxMinutes: toValue(options.slotMaxMinutes) ?? 24 * 60,
            slotMinutes: toValue(options.slotMinutes) ?? 60,
            today: today.value,
        }),
    );

    /** Fitted to the undragged events, so the axis holds still while a drag previews. */
    const gantt = computed(() =>
        createGantt({
            events: displayEvents.value,
            rangeEvents: events.value,
            scale: toValue(options.ganttScale) ?? 'week',
            weekStartsOn: weekStartsOn.value,
            today: today.value,
            links: toValue(options.ganttLinks) ?? [],
        }),
    );

    /** Row index of the focused resource cell, alongside `focusedDate`. */
    const focusedRow = ref(0);

    const title = computed(() =>
        periodTitle(date.value, view.value, weekStartsOn.value, locale.value),
    );

    const visibleRange = computed(() => ({ start: grid.value.start, end: grid.value.end }));

    function setDate(value: Temporal.PlainDate) {
        date.value = value;
        focusedDate.value = value;
    }

    /** Moves focus, and pages the view when the date leaves the current period. */
    function focusDate(value: Temporal.PlainDate) {
        focusedDate.value = value;

        if (!isSamePeriod(value, date.value, view.value, weekStartsOn.value)) {
            date.value = value;
        }
    }

    return {
        date,
        view,
        weekStartsOn,
        timeZone,
        locale,
        now,
        today,
        focusedDate,
        focusedRow,
        highlightedEventId,
        events,
        resources,
        grid,
        range,
        resourceGrid,
        timeGrid,
        timeline,
        gantt,
        title,
        visibleRange,
        setDate,
        focusDate,
        prev: () => setDate(navigate(date.value, view.value, -1)),
        next: () => setDate(navigate(date.value, view.value, 1)),
        goToToday: () => setDate(today.value),
        ...interactions,
    };
}

export type CalendarContext = ReturnType<typeof useCalendar>;

const CALENDAR_CONTEXT: InjectionKey<CalendarContext> = Symbol('CalendarContext');

/** Children see events as plain `CalendarEventInput`, so the root's event type is erased here. */
export function provideCalendarContext<T extends CalendarEventInput>(
    context: ReturnType<typeof useCalendar<T>>,
) {
    provide(CALENDAR_CONTEXT, context as unknown as CalendarContext);
}

export function injectCalendarContext(component: string): CalendarContext {
    const context = inject(CALENDAR_CONTEXT, null);

    if (!context) {
        throw new Error(`<${component}> must be used inside <CalendarRoot>.`);
    }

    return context;
}
