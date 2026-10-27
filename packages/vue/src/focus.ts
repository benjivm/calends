const FOCUSABLE = 'a[href], button, [tabindex]:not([tabindex="-1"])';

/** The element itself if it takes focus, else the first focusable thing inside it. */
export function focusTarget(element: Element | null | undefined): HTMLElement | null {
    if (!element) return null;

    return element.matches(FOCUSABLE)
        ? (element as HTMLElement)
        : element.querySelector<HTMLElement>(FOCUSABLE);
}
