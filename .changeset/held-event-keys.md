---
'@calends/vue': patch
---

A held event no longer captures keys page-wide. Tab puts it back (focus still moves on), as does a press outside
the calendar, and Space, Enter, and arrows typed outside the calendar reach their own targets instead of moving or
dropping the event.
