---
'@calends/core': minor
'@calends/vue': minor
---

Gantt links now leave through the predecessor's top or bottom edge instead of its end, so a line no longer runs through a name drawn beside a short bar. `routeGanttLink` takes the two bars' boxes (`{ left, right, top, bottom }`) instead of two points. Links take an optional `label`, and `GanttLinks` gives each one a `labelPoint` where a right-aligned label ends, just before the arrow. The `GanttCalendar` recipe draws it.
