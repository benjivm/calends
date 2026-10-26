import { computed, inject, provide, toValue, type InjectionKey, type MaybeRefOrGetter } from 'vue';
import type { CalendarEvent, ResourceId } from '@calends/core';
import { injectCalendarContext } from './useCalendar.js';
import type { KeyboardAxes } from './useInteractions.js';

interface EventPrimitiveContext {
    event: () => CalendarEvent<any>;
}

const EVENT_CONTEXT: InjectionKey<EventPrimitiveContext> = Symbol('CalendarEventPrimitive');

/**
 * Past, highlighted, editable, and dragging state shared by every way of drawing an event,
 * plus its pointer and key handlers. Highlighting goes through the calendar context so every
 * piece of one event (each week's bar, each day of an overnight event) lights up together.
 */
export function useEventState(
    component: string,
    event: MaybeRefOrGetter<CalendarEvent<any>>,
    interaction: {
        axes: MaybeRefOrGetter<KeyboardAxes>;
        resourceId?: MaybeRefOrGetter<ResourceId | null | undefined>;
    },
) {
    const calendar = injectCalendarContext(component);
    const { now, today, highlightedEventId } = calendar;

    provide(EVENT_CONTEXT, { event: () => toValue(event) });

    const isHighlighted = computed(() => highlightedEventId.value === toValue(event).id);
    const isEditable = computed(() => calendar.canEdit(toValue(event)));
    const isDragging = computed(() => calendar.isDragging(toValue(event)));

    const isPast = computed(() => {
        const { allDay, end, endDate } = toValue(event);

        return allDay
            ? Temporal.PlainDate.compare(endDate, today.value) < 0
            : Temporal.ZonedDateTime.compare(end as Temporal.ZonedDateTime, now.value) < 0;
    });

    function highlight() {
        highlightedEventId.value = toValue(event).id;
    }

    function unhighlight() {
        if (isHighlighted.value) {
            highlightedEventId.value = null;
        }
    }

    function onPointerdown(pointerEvent: PointerEvent) {
        calendar.startPointerDrag(pointerEvent, toValue(event), 'move');
    }

    function onKeydown(keyboardEvent: KeyboardEvent) {
        calendar.handleEventKeydown(
            keyboardEvent,
            toValue(event),
            toValue(interaction.axes),
            toValue(interaction.resourceId),
        );
    }

    return {
        isHighlighted,
        isPast,
        isEditable,
        isDragging,
        highlight,
        unhighlight,
        onPointerdown,
        onKeydown,
    };
}

export function injectEventPrimitive(component: string): EventPrimitiveContext {
    const context = inject(EVENT_CONTEXT, null);

    if (!context) {
        throw new Error(`<${component}> must be used inside an event primitive.`);
    }

    return context;
}
