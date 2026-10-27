# Theming the recipes

The primitives are unstyled. **Recipes** are styled components built on them, like the month view
on this site: copy one into your project and change whatever you like. They're written with
Tailwind CSS v4 and style against the [shadcn-vue](https://www.shadcn-vue.com) theme tokens, so in
an app that already uses shadcn-vue they match your theme with no setup.

## The tokens

Recipes use these utilities, so your Tailwind theme needs the matching colors:

| Utility                                 | Used for                                                  |
| --------------------------------------- | --------------------------------------------------------- |
| `bg-card`, `text-card-foreground`       | The calendar's surface.                                   |
| `text-foreground`                       | Event titles and dates.                                   |
| `bg-muted`, `text-muted-foreground`     | Header rows, outside days, secondary text, and skeletons. |
| `bg-primary`, `text-primary-foreground` | Today's date.                                             |
| `bg-primary/10`, `bg-primary/20`        | Event bars, resting and highlighted.                      |
| `bg-accent`, `text-accent-foreground`   | Hovered buttons.                                          |
| `bg-popover`, `text-popover-foreground` | The "+N more" popover.                                    |
| `bg-background`                         | Outline buttons.                                          |
| `border-border`                         | Every border.                                             |
| `ring-ring`                             | Focus rings.                                              |

A few colors mean the same thing in every theme, so they use Tailwind's default palette instead:
the current-time line is `red-500`, and the resource view marks free rows green and double-bookings
red, as the Gantt view does for conflicting dependencies.

Event bars are tinted with your `primary` color, so they follow your brand. To color events by
category, override the bar's background in the recipe's `event` slot.

## Without shadcn-vue

Define the variables, and map them into Tailwind with `@theme inline`. These are shadcn's neutral
values; any palette works.

```css
@import 'tailwindcss';

@custom-variant dark (&:where(.dark, .dark *));

:root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.97 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --accent: oklch(0.97 0 0);
    --accent-foreground: oklch(0.205 0 0);
    --border: oklch(0.922 0 0);
    --ring: oklch(0.708 0 0);
}

.dark {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --popover: oklch(0.205 0 0);
    --popover-foreground: oklch(0.985 0 0);
    --primary: oklch(0.922 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.269 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --border: oklch(1 0 0 / 10%);
    --ring: oklch(0.556 0 0);
}

@theme inline {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-card: var(--card);
    --color-card-foreground: var(--card-foreground);
    --color-popover: var(--popover);
    --color-popover-foreground: var(--popover-foreground);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-muted: var(--muted);
    --color-muted-foreground: var(--muted-foreground);
    --color-accent: var(--accent);
    --color-accent-foreground: var(--accent-foreground);
    --color-border: var(--border);
    --color-ring: var(--ring);
}
```

Dark mode follows a `.dark` class on an ancestor, as shadcn-vue does.

## Dependencies

Recipes import from `@calends/vue` and `reka-ui` (for the "+N more" popover), and nothing else. Icons
are inline SVG. shadcn-vue apps already have `reka-ui`; anywhere else, install it for the recipes.
The primitives themselves don't need it.
