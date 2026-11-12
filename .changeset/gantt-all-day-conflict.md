---
'@calends/core': patch
---

A Gantt dependency between two all-day tasks is a conflict when the successor starts on the predecessor's last day.
Timed tasks still only conflict when the successor starts on an earlier day.
