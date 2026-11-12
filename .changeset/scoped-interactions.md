---
'@calends/vue': patch
---

Keep drags and keyboard moves inside their own calendar when a page has more than one: an event dragged over
another calendar's days no longer drops there, and a keyboard move returns focus to the event in its own calendar
even when the other shows the same event id. `useCalendar` takes a `root` element for this; `CalendarRoot`
passes its own.
