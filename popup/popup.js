const msg = document.getElementById("msg");

getItems().then((items) => {
  const n = items.filter((i) => !i.doneAt).length;
  document.getElementById("count").textContent = n ? n : "";
});

document.getElementById("save").addEventListener("click", async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const res = await saveItem({ url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl });
  msg.textContent = res.reason;
  msg.hidden = false;
  if (res.ok) setTimeout(() => window.close(), 900);
});

document.getElementById("show").addEventListener("click", () => {
  // Must be called synchronously inside the click handler.
  browser.sidebarAction.open();
  window.close();
});
