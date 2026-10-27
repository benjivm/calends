import {
    computed,
    nextTick,
    onScopeDispose,
    ref,
    shallowRef,
    toValue,
    type ComputedRef,
    type MaybeRefOrGetter,
} from 'vue';
import {
    daysBetween,
    moveEvent,
    orderedRange,
    resizeEvent,
    snapMinutes,
    withTimes,
    type CalendarEvent,
    type CalendarEventInput,
    type CalendarResource,
    type EventDelta,
    type EventTimes,
    type ResourceId,
} from '@calends/core';

/** What sits under the pointer: a day cell, a point in a day's hours, or a point on a timeline. */
export interface DropTarget {
    kind: 'day' | 'time' | 'axis' | 'dayaxis';
    date: Temporal.PlainDate;
    /** Wall-clock minutes from midnight, for `time` and `axis` targets. */
    minutes: number | null;
    /** Present only on targets inside a resource row; null for the unassigned row. */
    resourceId?: ResourceId | null;
}

export interface EventDropDetail<T extends CalendarEventInput = CalendarEventInput> {
    event: T;
    start: Temporal.PlainDate | Temporal.ZonedDateTime;
    end: Temporal.PlainDate | Temporal.ZonedDateTime;
    previousStart: Temporal.PlainDate | Temporal.ZonedDateTime;
    previousEnd: Temporal.PlainDate | Temporal.ZonedDateTime;
    allDay: boolean;
    /** Set only when the event moved to another resource row (null for unassigned). */
    resourceId?: ResourceId | null;
    previousResourceId?: ResourceId | null;
}

export interface RangeSelectDetail {
    start: Temporal.PlainDate | Temporal.ZonedDateTime;
    /** Inclusive last day for all-day ranges, exclusive end time for timed ones. */
    end: Temporal.PlainDate | Temporal.ZonedDateTime;
    allDay: boolean;
    resourceId?: ResourceId | null;
}

/** How arrow keys move a picked-up event in each layout. */
export interface KeyboardAxes {
    horizontal: 'day' | 'minutes';
    vertical: 'week' | 'minutes' | 'resource' | 'none';
    /** Resource ids in row order, for `vertical: 'resource'`. */
    resourceOrder?: readonly (ResourceId | null)[];
}

export interface InteractionOptions<T extends CalendarEventInput> {
    events: ComputedRef<CalendarEvent<T>[]>;
    resources: MaybeRefOrGetter<readonly CalendarResource[] | undefined>;
    getResourceIds?: (event: T) => readonly ResourceId[] | null | undefined;
    timeZone: ComputedRef<string>;
    locale: ComputedRef<string | undefined>;
    rangeStart: ComputedRef<Temporal.PlainDate>;
    slotMinMinutes: MaybeRefOrGetter<number | undefined>;
    slotMaxMinutes: MaybeRefOrGetter<number | undefined>;
    editable?: MaybeRefOrGetter<boolean | undefined>;
    selectable?: MaybeRefOrGetter<boolean | undefined>;
    snapMinutes?: MaybeRefOrGetter<number | undefined>;
    canEdit?: (event: T) => boolean;
    onEventDrop?: (detail: EventDropDetail<T>) => void;
    onEventResize?: (detail: EventDropDetail<T>) => void;
    onRangeSelect?: (detail: RangeSelectDetail) => void;
}

type DragKind = 'move' | 'resize-start' | 'resize-end';

export interface DragState<T extends CalendarEventInput> {
    kind: DragKind;
    event: CalendarEvent<T>;
    origin: DropTarget;
    started: boolean;
    keyboard: boolean;
    pointer: { x: number; y: number };
    preview: EventTimes;
    resourceId: ResourceId | null | undefined;
    /** Keyboard only: accumulated movement, and a separate end-edge resize from Shift. */
    moveDelta: EventDelta;
    endDelta: EventDelta;
    axes?: KeyboardAxes;
}

const DRAG_THRESHOLD = 4;

const LONG_PRESS_MS = 500;

/** How far a finger can wander during a long press before it counts as a scroll. */
const LONG_PRESS_SLOP = 10;

/** How close to a scroll container's edge a drag starts scrolling it, and how fast, per frame. */
const SCROLL_EDGE = 40;
const SCROLL_SPEED = 16;

const FOCUSABLE = 'a[href], button, [tabindex]:not([tabindex="-1"])';

/** A press on any of these inside a day is meant for it, not the start of a range selection. */
const NOT_SELECTION =
    '[data-event-id], [data-calendar-control], a[href], button, input, select, textarea';

/** The element's scrollable ancestors, nearest first, ending with the page. */
function scrollContainers(element: Element | null): Element[] {
    const page = document.scrollingElement ?? document.documentElement;
    const containers: Element[] = [];

    for (let node = element?.parentElement; node && node !== page; node = node.parentElement) {
        const { overflowX, overflowY } = getComputedStyle(node);

        if (/auto|scroll|overlay/.test(overflowX + overflowY)) {
            containers.push(node);
        }
    }

    return [...containers, page];
}

/** Scroll speed toward `start` (negative) or `end` near either edge, full speed past it. */
function edgeSpeed(position: number, start: number, end: number): number {
    const edge = Math.min(SCROLL_EDGE, (end - start) / 4);

    if (position < start + edge)
        return -SCROLL_SPEED * Math.min((start + edge - position) / edge, 1);
    if (position > end - edge) return SCROLL_SPEED * Math.min((position - end + edge) / edge, 1);

    return 0;
}

/**
 * Scrolls each container the point is near the edge of, along the axes it's inside on the
 * other side of. Returns whether anything moved.
 */
function scrollTowards(containers: Element[], x: number, y: number): boolean {
    const page = document.scrollingElement ?? document.documentElement;
    let scrolled = false;

    for (const container of containers) {
        const rect =
            container === page
                ? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
                : container.getBoundingClientRect();
        const dx = y >= rect.top && y <= rect.bottom ? edgeSpeed(x, rect.left, rect.right) : 0;
        const dy = x >= rect.left && x <= rect.right ? edgeSpeed(y, rect.top, rect.bottom) : 0;
        const left = clamp(
            container.scrollLeft + dx,
            container.scrollWidth - container.clientWidth,
        );
        const top = clamp(
            container.scrollTop + dy,
            container.scrollHeight - container.clientHeight,
        );

        if (left !== container.scrollLeft || top !== container.scrollTop) {
            container.scrollLeft = left;
            container.scrollTop = top;
            scrolled = true;
        }
    }

    return scrolled;
}

const clamp = (value: number, max: number) => Math.round(Math.min(Math.max(value, 0), max));

interface PointerGesture {
    /** The press counts: at once for a mouse or pen, after a long press for touch. */
    begin: () => void;
    move: (x: number, y: number) => void;
    end: (cancelled: boolean) => void;
}

export function useInteractions<T extends CalendarEventInput>(options: InteractionOptions<T>) {
    const drag = shallowRef<DragState<T> | null>(null);
    const selection = shallowRef<{ anchor: DropTarget; current: DropTarget } | null>(null);
    const announcement = ref('');

    const editable = computed(() => toValue(options.editable) ?? false);
    const selectable = computed(() => toValue(options.selectable) ?? false);
    const snap = computed(() => toValue(options.snapMinutes) ?? 15);
    const slotMin = computed(() => toValue(options.slotMinMinutes) ?? 0);
    const slotMax = computed(() => toValue(options.slotMaxMinutes) ?? 24 * 60);

    function canEdit(event: CalendarEvent<T>): boolean {
        return editable.value && (options.canEdit?.(event.source) ?? true);
    }

    function resourceFromAttribute(value: string | undefined): ResourceId | null | undefined {
        if (value === undefined) return undefined;
        if (value === '') return null;

        const match = (toValue(options.resources) ?? []).find(
            (resource) => String(resource.id) === value,
        );

        return match ? match.id : value;
    }

    /** Finds the drop target under a point, from the data attributes the primitives render. */
    function resolveTarget(x: number, y: number): DropTarget | null {
        for (const element of document.elementsFromPoint(x, y)) {
            // A bar's DOM parent is its start-day cell, not the day under the pointer, so look past events.
            if ((element as HTMLElement).closest('[data-event-id]')) continue;

            const host = (element as HTMLElement).closest<HTMLElement>('[data-drop]');

            if (!host) continue;

            const kind = host.dataset.drop as DropTarget['kind'];
            const resourceId = resourceFromAttribute(host.dataset.resourceId);
            const rect = host.getBoundingClientRect();
            const window = slotMax.value - slotMin.value;

            // A Gantt track: days across, its first day and length on the element itself.
            if (kind === 'dayaxis') {
                const axisDays = Number(host.dataset.axisDays);
                const along = Math.min(Math.max((x - rect.left) / rect.width, 0), 0.9999);

                return {
                    kind,
                    date: Temporal.PlainDate.from(host.dataset.axisStart!).add({
                        days: Math.floor(along * axisDays),
                    }),
                    minutes: null,
                    resourceId,
                };
            }

            if (kind === 'axis') {
                const axisMinutes = Number(host.dataset.axisMinutes);
                const along =
                    Math.min(Math.max((x - rect.left) / rect.width, 0), 0.9999) * axisMinutes;
                const dayIndex = Math.floor(along / window);

                return {
                    kind,
                    date: options.rangeStart.value.add({ days: dayIndex }),
                    minutes: slotMin.value + (along - dayIndex * window),
                    resourceId,
                };
            }

            const date = Temporal.PlainDate.from(host.dataset.date!);

            if (kind === 'time') {
                const fraction = Math.min(Math.max((y - rect.top) / rect.height, 0), 1);

                return { kind, date, minutes: slotMin.value + fraction * window, resourceId };
            }

            return { kind, date, minutes: null, resourceId };
        }

        return null;
    }

    function deltaBetween(origin: DropTarget, target: DropTarget): EventDelta {
        const days = daysBetween(origin.date, target.date);
        const minutes =
            origin.minutes !== null && target.minutes !== null
                ? snapMinutes(target.minutes - origin.minutes, snap.value)
                : 0;

        return { days, minutes };
    }

    function applyDrag(state: DragState<T>, target: DropTarget) {
        const delta = deltaBetween(state.origin, target);
        const preview =
            state.kind === 'move'
                ? moveEvent(state.event, delta)
                : resizeEvent(
                      state.event,
                      state.kind === 'resize-start' ? 'start' : 'end',
                      delta,
                      snap.value,
                  );
        const resourceId =
            state.kind === 'move' &&
            target.resourceId !== undefined &&
            state.origin.resourceId !== undefined
                ? target.resourceId
                : state.origin.resourceId;

        drag.value = { ...state, started: true, preview, resourceId };
    }

    /** The events with the dragged one at its preview position, for every layout to render. */
    const displayEvents = computed(() => {
        const state = drag.value;

        if (!state?.started) return options.events.value;

        return options.events.value.map((event) =>
            event.id === state.event.id ? withTimes(event, state.preview) : event,
        );
    });

    /** Resource ids with the dragged event moved to its preview row. */
    function displayResourceIds(event: T): readonly ResourceId[] | null | undefined {
        const ids = options.getResourceIds?.(event);
        const state = drag.value;

        if (
            !state?.started ||
            state.event.source !== event ||
            state.resourceId === state.origin.resourceId
        ) {
            return ids;
        }

        const others = (ids ?? []).filter((id) => id !== state.origin.resourceId);

        return state.resourceId === null || state.resourceId === undefined
            ? others
            : [...new Set([...others, state.resourceId])];
    }

    function isDragging(event: CalendarEvent<T>): boolean {
        return Boolean(drag.value?.started && drag.value.event.id === event.id);
    }

    function changed(state: DragState<T>): boolean {
        return (
            !state.preview.start.equals(state.event.start as never) ||
            !state.preview.end.equals(state.event.end as never) ||
            state.resourceId !== state.origin.resourceId
        );
    }

    function commit(state: DragState<T>) {
        if (!changed(state)) return;

        const detail: EventDropDetail<T> = {
            event: state.event.source,
            start: state.preview.start,
            end: state.preview.end,
            previousStart: state.event.start,
            previousEnd: state.event.end,
            allDay: state.event.allDay,
        };

        if (state.resourceId !== state.origin.resourceId) {
            detail.resourceId = state.resourceId;
            detail.previousResourceId = state.origin.resourceId;
        }

        if (state.kind === 'move') {
            options.onEventDrop?.(detail);
        } else {
            options.onEventResize?.(detail);
        }
    }

    function swallowNextClick() {
        const swallow = (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
        };

        window.addEventListener('click', swallow, { capture: true, once: true });
        // If no click follows (the pointer left the element), don't eat a later one.
        setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
    }

    /** Ends the pointer gesture under way, from a pending long press to a drag. */
    let releasePointer: (() => void) | null = null;

    onScopeDispose(() => releasePointer?.());

    /**
     * Follows one pointer until it lifts, is cancelled, or Escape is pressed, ignoring any other
     * (like a second finger). Touch begins only after a long press, since it can't tell a drag
     * from a scroll at pointerdown: a finger that moves first scrolls the page as usual. Until
     * it lifts, a held touch can't scroll, select text, open the context menu, or start a
     * native drag. Once the pointer moves, nearing a scroll container's edge scrolls it.
     */
    function trackPointer(pointerEvent: PointerEvent, gesture: PointerGesture) {
        const { pointerId, clientX, clientY } = pointerEvent;
        // Touch events stay with the element they started on, even once a drag re-renders it
        // out of the document, where they no longer reach the window.
        const origin = pointerEvent.target as Element;
        const containers = scrollContainers(origin);
        const blocked = ['contextmenu', 'selectstart', 'dragstart'] as const;
        let begun = false;
        let moved = false;
        let last = { x: clientX, y: clientY };
        let frame = 0;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const blockScroll = (touch: Event) => begun && touch.cancelable && touch.preventDefault();
        const block = (event: Event) => event.preventDefault();

        const scroll = () => {
            frame = 0;

            if (!scrollTowards(containers, last.x, last.y)) return;

            // The content moved under a still pointer, so what it's over has changed.
            gesture.move(last.x, last.y);
            frame = requestAnimationFrame(scroll);
        };

        const onMove = (move: PointerEvent) => {
            if (move.pointerId !== pointerId) return;

            const distance = Math.hypot(move.clientX - clientX, move.clientY - clientY);

            last = { x: move.clientX, y: move.clientY };

            if (!begun) {
                if (distance > LONG_PRESS_SLOP) stop(true);

                return;
            }

            moved ||= distance >= DRAG_THRESHOLD;
            gesture.move(last.x, last.y);

            if (moved && !frame) {
                frame = requestAnimationFrame(scroll);
            }
        };

        const onUp = (up: PointerEvent) => up.pointerId === pointerId && stop(false);
        const onCancel = (cancel: PointerEvent) => cancel.pointerId === pointerId && stop(true);
        const onEscape = (key: KeyboardEvent) => key.key === 'Escape' && stop(true);

        function stop(cancelled: boolean) {
            clearTimeout(timer);
            cancelAnimationFrame(frame);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
            window.removeEventListener('keydown', onEscape);
            window.removeEventListener('touchmove', blockScroll);
            origin.removeEventListener('touchmove', blockScroll);
            blocked.forEach((type) => window.removeEventListener(type, block, true));
            releasePointer = null;

            if (begun) gesture.end(cancelled);
        }

        function begin() {
            begun = true;
            gesture.begin();
        }

        releasePointer = () => stop(true);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        window.addEventListener('keydown', onEscape);

        if (pointerEvent.pointerType !== 'touch') {
            begin();

            return;
        }

        // Registered now, not when the press fires: a browser decides at touchstart whether
        // the touch's moves can be cancelled at all.
        window.addEventListener('touchmove', blockScroll, { passive: false });
        origin.addEventListener('touchmove', blockScroll, { passive: false });
        blocked.forEach((type) => window.addEventListener(type, block, true));
        timer = setTimeout(begin, LONG_PRESS_MS);
    }

    function startPointerDrag(pointerEvent: PointerEvent, event: CalendarEvent<T>, kind: DragKind) {
        if (pointerEvent.button !== 0 || !canEdit(event)) return;

        if (kind !== 'move') {
            pointerEvent.stopPropagation();
        }

        if (releasePointer || drag.value) return;

        const origin = resolveTarget(pointerEvent.clientX, pointerEvent.clientY);

        if (!origin) return;

        const touch = pointerEvent.pointerType === 'touch';

        // Stops the browser's own link drag and text selection, which would cancel the pointer.
        // Touch keeps its default, so a swipe that starts on an event still scrolls.
        if (!touch) {
            pointerEvent.preventDefault();
        }

        const pressed: DragState<T> = {
            kind,
            event,
            origin,
            started: false,
            keyboard: false,
            pointer: { x: pointerEvent.clientX, y: pointerEvent.clientY },
            preview: { start: event.start, end: event.end },
            resourceId: origin.resourceId,
            moveDelta: {},
            endDelta: {},
        };

        trackPointer(pointerEvent, {
            begin() {
                drag.value = pressed;

                // A long press has already told the drag apart from a tap, so lift it right away.
                if (touch) applyDrag(pressed, origin);
            },
            move(x, y) {
                const state = drag.value;

                if (!state) return;

                const distance = Math.hypot(x - state.pointer.x, y - state.pointer.y);

                if (!state.started && distance < DRAG_THRESHOLD) return;

                const target = resolveTarget(x, y);

                if (target) {
                    applyDrag(state, target);
                }
            },
            end(cancelled) {
                const state = drag.value;
                drag.value = null;

                if (state?.started) {
                    swallowNextClick();

                    if (!cancelled) commit(state);
                }
            },
        });
    }

    function startSelection(pointerEvent: PointerEvent) {
        const element = pointerEvent.target as HTMLElement | null;

        if (
            !selectable.value ||
            pointerEvent.button !== 0 ||
            releasePointer ||
            drag.value ||
            element?.closest(NOT_SELECTION)
        ) {
            return;
        }

        const anchor = resolveTarget(pointerEvent.clientX, pointerEvent.clientY);

        if (!anchor) return;

        // Stops text selection while dragging, which also skips the click's focus, so focus by hand.
        if (pointerEvent.pointerType !== 'touch') {
            pointerEvent.preventDefault();
        }

        trackPointer(pointerEvent, {
            begin() {
                element?.closest<HTMLElement>('[role="gridcell"]')?.focus({ preventScroll: true });
                selection.value = { anchor, current: anchor };
            },
            move(x, y) {
                const target = resolveTarget(x, y);

                if (target && target.kind === anchor.kind) {
                    selection.value = { anchor, current: target };
                }
            },
            end(cancelled) {
                const range = selectedRange.value;
                selection.value = null;

                if (!cancelled && range) {
                    options.onRangeSelect?.(range.detail);
                }
            },
        });
    }

    const toZoned = (date: Temporal.PlainDate, minutes: number) =>
        date.toPlainDateTime({ hour: 0 }).add({ minutes }).toZonedDateTime(options.timeZone.value);

    /**
     * The selection in a form the layouts can draw: whole days for cells, a minute range on
     * the anchor's day for time columns, and axis minutes for timelines.
     */
    const selectedRange = computed(() => {
        const current = selection.value;

        if (!current) return null;

        const { anchor } = current;

        if (anchor.kind === 'day' || anchor.kind === 'dayaxis') {
            const [startDate, endDate] = orderedRange(anchor.date, current.current.date);

            return {
                kind: anchor.kind,
                resourceId: anchor.resourceId,
                startDate,
                endDate,
                detail: {
                    start: startDate,
                    end: endDate,
                    allDay: true,
                    resourceId: anchor.resourceId,
                },
            };
        }

        const step = snap.value;
        const absolute = (target: DropTarget) =>
            daysBetween(options.rangeStart.value, target.date) * 24 * 60 + target.minutes!;
        const sameDay = anchor.kind === 'time';
        const [low, high] = orderedRange(
            sameDay ? anchor.minutes! : absolute(anchor),
            sameDay ? current.current.minutes! : absolute(current.current),
        );
        const startAt = Math.floor(low / step) * step;
        const endAt = Math.max(Math.ceil(high / step) * step, startAt + step);

        const startDate = sameDay
            ? anchor.date
            : options.rangeStart.value.add({ days: Math.floor(startAt / 1440) });
        const startMinutes = sameDay ? startAt : startAt % 1440;
        const endDate = sameDay
            ? anchor.date
            : options.rangeStart.value.add({ days: Math.floor(endAt / 1440) });
        const endMinutes = sameDay ? endAt : endAt % 1440;

        return {
            kind: anchor.kind,
            resourceId: anchor.resourceId,
            startDate,
            endDate,
            startMinutes,
            endMinutes,
            detail: {
                start: toZoned(startDate, startMinutes),
                end: toZoned(endDate, endMinutes),
                allDay: false,
                resourceId: anchor.resourceId,
            },
        };
    });

    function describe(times: EventTimes): string {
        const format = (value: Temporal.PlainDate | Temporal.ZonedDateTime) =>
            value instanceof Temporal.PlainDate
                ? value.toLocaleString(options.locale.value, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                  })
                : value.toLocaleString(options.locale.value, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                  });

        return `${format(times.start)} to ${format(times.end)}`;
    }

    async function refocus(event: CalendarEvent<T>) {
        await nextTick();

        const element = document.querySelector<HTMLElement>(
            `[data-event-id="${CSS.escape(String(event.id))}"]`,
        );
        const target = element?.matches(FOCUSABLE)
            ? element
            : element?.querySelector<HTMLElement>(FOCUSABLE);

        target?.focus();
    }

    function keyboardPreview(state: DragState<T>): DragState<T> {
        const moved = moveEvent(state.event, state.moveDelta);
        const preview =
            state.endDelta.days || state.endDelta.minutes
                ? resizeEvent(withTimes(state.event, moved), 'end', state.endDelta, snap.value)
                : moved;

        return { ...state, preview };
    }

    let releaseKeyboard: (() => void) | null = null;

    function endKeyboardDrag() {
        releaseKeyboard?.();
        releaseKeyboard = null;
    }

    onScopeDispose(endKeyboardDrag);

    function handleHeldKey(keyboardEvent: KeyboardEvent) {
        const state = drag.value;

        if (!state?.keyboard) {
            endKeyboardDrag();

            return;
        }

        const event = state.event;
        const axes = state.axes!;

        if (keyboardEvent.key === 'Escape') {
            keyboardEvent.preventDefault();
            keyboardEvent.stopPropagation();
            drag.value = null;
            endKeyboardDrag();
            announcement.value = 'Move cancelled.';
            refocus(event);

            return;
        }

        if (keyboardEvent.key === ' ' || keyboardEvent.key === 'Enter') {
            keyboardEvent.preventDefault();
            keyboardEvent.stopPropagation();
            drag.value = null;
            endKeyboardDrag();
            commit({
                ...state,
                kind: state.endDelta.days || state.endDelta.minutes ? 'resize-end' : 'move',
            });
            announcement.value = `Dropped. ${describe(state.preview)}.`;
            refocus(event);

            return;
        }

        const directions: Record<string, [number, 'horizontal' | 'vertical']> = {
            ArrowLeft: [-1, 'horizontal'],
            ArrowRight: [1, 'horizontal'],
            ArrowUp: [-1, 'vertical'],
            ArrowDown: [1, 'vertical'],
        };
        const direction = directions[keyboardEvent.key];

        if (!direction) return;

        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();

        const [sign, axis] = direction;
        const unit = axis === 'horizontal' ? axes.horizontal : axes.vertical;
        const resizing = keyboardEvent.shiftKey;
        const delta = { ...(resizing ? state.endDelta : state.moveDelta) };
        const step = event.allDay ? 0 : snap.value;
        let next: DragState<T> = state;

        if (unit === 'day') {
            delta.days = (delta.days ?? 0) + sign;
        } else if (unit === 'week') {
            delta.days = (delta.days ?? 0) + sign * 7;
        } else if (unit === 'minutes' && step) {
            delta.minutes = (delta.minutes ?? 0) + sign * step;
        } else if (unit === 'resource' && axes.resourceOrder && !resizing) {
            const order = axes.resourceOrder;
            const index = order.indexOf(state.resourceId ?? null);

            next = {
                ...state,
                resourceId: order[Math.min(Math.max(index + sign, 0), order.length - 1)],
            };
        } else {
            return;
        }

        if (unit !== 'resource') {
            next = resizing ? { ...next, endDelta: delta } : { ...next, moveDelta: delta };
        }

        next = keyboardPreview(next);
        drag.value = next;
        announcement.value = describe(next.preview);
        refocus(event);
    }

    /**
     * Space picks an event up; then arrows move it (Shift+arrows stretch its end), Space or
     * Enter drops it, and Escape puts it back. While it's held, keys are read on the window:
     * each move re-renders the event in its new cell, which briefly takes focus away.
     */
    function handleEventKeydown(
        keyboardEvent: KeyboardEvent,
        event: CalendarEvent<T>,
        axes: KeyboardAxes,
        resourceId?: ResourceId | null,
    ) {
        if (keyboardEvent.key !== ' ' || drag.value || !canEdit(event)) return;

        keyboardEvent.preventDefault();
        drag.value = {
            kind: 'move',
            event,
            origin: { kind: 'day', date: event.startDate, minutes: null, resourceId },
            started: true,
            keyboard: true,
            pointer: { x: 0, y: 0 },
            preview: { start: event.start, end: event.end },
            resourceId,
            moveDelta: { days: 0, minutes: 0 },
            endDelta: { days: 0, minutes: 0 },
            axes,
        };
        announcement.value =
            'Picked up. Arrow keys move it, Shift with arrows changes its end, Space drops it, Escape cancels.';

        window.addEventListener('keydown', handleHeldKey, { capture: true });
        releaseKeyboard = () =>
            window.removeEventListener('keydown', handleHeldKey, { capture: true });
    }

    return {
        editable,
        selectable,
        drag,
        selectedRange,
        announcement,
        displayEvents,
        displayResourceIds,
        canEdit,
        isDragging,
        startPointerDrag,
        startSelection,
        handleEventKeydown,
    };
}
