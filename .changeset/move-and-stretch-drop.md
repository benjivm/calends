---
'@calends/vue': patch
---

A keyboard move that also stretched the end with Shift emits `event-drop` (with the stretched end) instead of
`event-resize`. `event-resize` is only for a change to an edge alone.
