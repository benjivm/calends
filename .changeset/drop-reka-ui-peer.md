---
'@calends/vue': minor
---

`reka-ui` is no longer a peer dependency. `as` and `as-child` work as before, through the package's own `Primitive`, and `@calends/vue` exports its `PrimitiveProps` and `AsTag` types. You can uninstall `reka-ui` unless something else in your app (like the recipes' "+N more" popover) uses it.
