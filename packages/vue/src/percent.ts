/** A share of an axis as a CSS percentage, so `top`, `left`, `height`, and `width` take it with no `calc()`. */
export function percent(part: number, whole: number): string {
    return `${(part / whole) * 100}%`;
}
