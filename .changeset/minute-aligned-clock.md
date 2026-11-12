---
'@calends/vue': patch
---

The calendar's clock ticks on the minute boundary instead of a minute after it mounted, so the now line and
`data-past` no longer lag the real time by up to 59 seconds.
