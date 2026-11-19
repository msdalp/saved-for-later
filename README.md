# Saved for Later

A simple read-later list for Firefox that lives in the sidebar.

## Features

- **Save for later** — toolbar button saves the current tab; right-click any page or link to save it too.
- **Reading list in the sidebar** — search, open with a click (Ctrl/Cmd/middle-click for a new tab).
- **Done, not deleted** — marking an item done hides it from your list; find it again under the *Done* tab and move it back anytime.
- **Auto-cleanup** — done items are purged 2 years after you mark them done.
- **Syncs across devices** — uses Firefox Sync (`storage.sync`). Make sure *Add-ons* is ticked in your Sync settings.
- Unread count badge on the toolbar icon; `Alt+Shift+L` toggles the sidebar.
- Light and dark theme support.

## Install from source

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and choose `manifest.json`.

Temporary add-ons are removed when Firefox restarts. For a permanent install, use a signed `.xpi`.

## Build a zip for signing

```bash
zip -r -X saved-for-later.zip manifest.json shared.js background.js icons popup sidebar -x '*.DS_Store'
```

## Limits

Firefox sync storage holds about 100 KB (roughly 300–400 saved pages). If it fills up, the oldest done items are removed first to make room.

## Privacy

No data collection, no network requests. Your list is stored only in Firefox's own storage and synced through your Firefox account.
