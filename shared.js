// Shared storage helpers (loaded by background, popup and sidebar).
//
// Items live in browser.storage.sync so they follow you across devices via
// Firefox Sync. Each item is its own key ("item:<id>") because sync storage
// limits each key to 8 KB, and so edits on two devices to different items
// merge cleanly instead of overwriting one big list.
//
// Firefox sync quota: ~100 KB total, 512 keys max.

const PURGE_AFTER_MS = 2 * 365 * 24 * 60 * 60 * 1000; // ~2 years
const PREFIX = "item:";
const MAX_TITLE = 200;
const MAX_URL = 2000;
const store = browser.storage.sync;

function isItemChange(changes) {
  return Object.keys(changes).some((k) => k.startsWith(PREFIX));
}

async function getItems() {
  const all = await store.get(null);
  return Object.entries(all)
    .filter(([k]) => k.startsWith(PREFIX))
    .map(([, v]) => v)
    .sort((a, b) => b.savedAt - a.savedAt);
}

function compact(item) {
  const out = {
    id: item.id,
    url: item.url.slice(0, MAX_URL),
    title: (item.title || item.url).slice(0, MAX_TITLE),
    savedAt: item.savedAt,
    doneAt: item.doneAt || null,
  };
  // Keep favicons only when they are short http(s) URLs (not huge data: URIs).
  const fav = item.favIconUrl || "";
  if (/^https?:/i.test(fav) && fav.length < 300) out.favIconUrl = fav;
  return out;
}

// Write one item; if sync storage is full, remove the oldest done items and retry.
async function putItem(item) {
  const data = { [PREFIX + item.id]: compact(item) };
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      await store.set(data);
      return true;
    } catch (e) {
      if (!/quota/i.test(String(e && e.message))) throw e;
      const oldestDone = (await getItems())
        .filter((i) => i.doneAt && i.id !== item.id)
        .sort((a, b) => a.doneAt - b.doneAt)
        .slice(0, 10);
      if (!oldestDone.length) return false; // full of unread items
      await store.remove(oldestDone.map((i) => PREFIX + i.id));
    }
  }
  return false;
}

async function saveItem({ url, title, favIconUrl }) {
  if (!url || !/^(https?|file|ftp):/i.test(url)) {
    return { ok: false, reason: "This page can't be saved." };
  }
  const items = await getItems();
  const existing = items.find((i) => i.url === url);
  if (existing && !existing.doneAt) return { ok: true, reason: "Already in your list." };

  const item = existing
    ? { ...existing, doneAt: null, savedAt: Date.now() }
    : { id: crypto.randomUUID(), url, title, favIconUrl, savedAt: Date.now(), doneAt: null };

  if (!(await putItem(item))) {
    return { ok: false, reason: "Sync storage is full. Mark some items done or delete them." };
  }
  return { ok: true, reason: existing ? "Moved back to your list." : "Saved for later." };
}

async function updateItem(id, patch) {
  const key = PREFIX + id;
  const { [key]: item } = await store.get(key);
  if (item) await putItem({ ...item, ...patch });
}

async function deleteItem(id) {
  await store.remove(PREFIX + id);
}

// Remove items marked done more than 2 years ago.
async function purgeOld() {
  const cutoff = Date.now() - PURGE_AFTER_MS;
  const old = (await getItems()).filter((i) => i.doneAt && i.doneAt <= cutoff);
  if (old.length) await store.remove(old.map((i) => PREFIX + i.id));
  return old.length;
}

// One-time move of the list kept in local storage by version 1.0.
async function migrateFromLocal() {
  const { items } = await browser.storage.local.get("items");
  if (!Array.isArray(items) || !items.length) return;
  const synced = new Set((await getItems()).map((i) => i.url));
  for (const item of items) {
    if (!synced.has(item.url)) await putItem(item);
  }
  await browser.storage.local.remove("items");
}
