---
'@calends/vue': minor
---

Touch can now move, resize, and select. A long press (half a second) picks up an event or starts a range selection, so a swipe that starts on the calendar still scrolls the page. While the touch is held it doesn't scroll, select text, or open the context menu, and a second finger is ignored. Dragging or selecting near the edge of a scroll container, or the page, now scrolls it, for mouse and pen too, so an event can reach hours or days outside the visible part of the time grid, timeline, Gantt, or resource view. The recipes widen their resize handles on coarse pointers and turn off the iOS long-press callout on editable events.
