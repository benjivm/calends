---
'@calends/vue': minor
---

The time grid has keyboard navigation. `TimeColumn` takes roving focus (with `data-focused`, `aria-current` on today, and its event count in the label): Left and Right change day and page past the period, Home and End go to its ends, PageUp and PageDown page it, and Down or Up enter the day's events. From an event, Up and Down step through the day's events and Left and Right go to the next day. The `TimeGridCalendar` recipe draws a focus ring on the focused day.
