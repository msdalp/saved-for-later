// Daily purge of items that were marked done over 2 years ago.
browser.alarms.create("purge", { periodInMinutes: 24 * 60 });
browser.alarms.onAlarm.addListener((a) => { if (a.name === "purge") purgeOld(); });
browser.runtime.onStartup.addListener(purgeOld);
migrateFromLocal().then(purgeOld);
browser.runtime.onInstalled.addListener(purgeOld);

// Right-click menus.
browser.contextMenus.create({ id: "save-page", title: "Save page for later", contexts: ["page", "tab"] });
browser.contextMenus.create({ id: "save-link", title: "Save link for later", contexts: ["link"] });

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "save-link") {
    saveItem({ url: info.linkUrl, title: info.linkText || info.linkUrl });
  } else if (tab) {
    saveItem({ url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl });
  }
});

// Badge with the number of unread items.
async function updateBadge() {
  const n = (await getItems()).filter((i) => !i.doneAt).length;
  browser.browserAction.setBadgeText({ text: n ? String(n) : "" });
  browser.browserAction.setBadgeBackgroundColor({ color: "#0060df" });
}
browser.storage.onChanged.addListener((c, area) => { if (area === "sync" && isItemChange(c)) updateBadge(); });
updateBadge();
