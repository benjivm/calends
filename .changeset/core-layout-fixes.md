---
'@calends/core': patch
---

Fix time grid and timeline layout edge cases: an event that ends exactly where the visible window starts is no longer
drawn as a zero-length piece at the top; an event across the fall-back hour (01:45 EDT to 01:15 EST) draws for its
real duration instead of vanishing from the time grid or getting a negative length on the timeline;
`createTimeGrid` and `createTimeline` throw a `RangeError` when `slotMaxMinutes` isn't greater than
`slotMinMinutes`, and `createTimeline` when `slotMinutes` isn't positive (it looped forever); and ISO strings with a
space separator and an offset, such as `'2026-11-02 09:00Z'`, parse as instants instead of throwing.
