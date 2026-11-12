---
'@calends/vue': minor
---

`CalendarRoot`'s `visible-range` slot prop is the days on screen in every view: whole weeks in the month view,
the week or day otherwise. It was the month grid's range everywhere. The root slot no longer passes `grid`, which
made every view build the month grid; `MonthGrid`'s slot still has it.
