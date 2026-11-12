---
'@calends/vue': patch
---

A timeline without `resources` no longer marks its single row `data-unassigned` or labels it "Unassigned".
`NowIndicator` draws on `now`'s date, like `TimelineNow`, so the two agree when `today` is set to another day.
