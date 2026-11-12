---
'@calends/core': minor
---

Paging months from a month's last day lands on the next month's last day, so Jan 31 goes to Feb 28 and then Mar 31
instead of drifting to Mar 28. Any other day is kept, clamped to a shorter month. This changes the `v-model:date`
values the previous and next buttons produce.
