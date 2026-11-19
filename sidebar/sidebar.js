let view = "unread"; // "unread" | "done"
const $ = (id) => document.getElementById(id);

function host(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function ago(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}

function button(cls, label, title, onClick) {
  const b = document.createElement("button");
  b.className = cls;
  b.textContent = label;
  b.title = title;
  b.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
  return b;
}

async function render() {
  const items = await getItems();
  const q = $("search").value.trim().toLowerCase();
  const unread = items.filter((i) => !i.doneAt);
  const done = items.filter((i) => i.doneAt).sort((a, b) => b.doneAt - a.doneAt);
  $("n-unread").textContent = unread.length || "";
  $("n-done").textContent = done.length || "";

  const shown = (view === "unread" ? unread : done).filter(
    (i) => !q || i.title.toLowerCase().includes(q) || i.url.toLowerCase().includes(q)
  );

  const list = $("list");
  list.replaceChildren();
  for (const item of shown) {
    const li = document.createElement("li");

    const fav = document.createElement("img");
    fav.className = "fav";
    fav.src = item.favIconUrl || "../icons/icon.svg";
    fav.onerror = () => { fav.src = "../icons/icon.svg"; };

    const body = document.createElement("div");
    body.className = "body";
    const a = document.createElement("a");
    a.className = "title";
    a.href = item.url;
    a.textContent = item.title;
    a.title = item.url;
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = view === "unread"
      ? `${host(item.url)} · saved ${ago(item.savedAt)}`
      : `${host(item.url)} · done ${ago(item.doneAt)}`;
    body.append(a, meta);

    // Click: open in current tab. Ctrl/Cmd/middle click: new tab.
    body.addEventListener("click", (e) => {
      e.preventDefault();
      const newTab = e.ctrlKey || e.metaKey || e.button === 1;
      newTab ? browser.tabs.create({ url: item.url }) : browser.tabs.update({ url: item.url });
    });
    body.addEventListener("auxclick", (e) => {
      if (e.button === 1) { e.preventDefault(); browser.tabs.create({ url: item.url }); }
    });

    const actions = document.createElement("div");
    actions.className = "actions";
    if (view === "unread") {
      actions.append(button("done", "✓", "Mark done", () => updateItem(item.id, { doneAt: Date.now() })));
    } else {
      actions.append(
        button("undo", "↺", "Move back to list", () => updateItem(item.id, { doneAt: null })),
        button("del", "✕", "Delete now", () => deleteItem(item.id))
      );
    }

    li.append(fav, body, actions);
    list.append(li);
  }

  $("empty").hidden = shown.length > 0;
  $("empty").textContent = q
    ? "No matches."
    : view === "unread"
      ? "Nothing saved yet. Use the toolbar button or right-click a page or link."
      : "No done items.";
  $("foot").hidden = view !== "done" || done.length === 0;
}

function setView(v) {
  view = v;
  $("tab-unread").classList.toggle("active", v === "unread");
  $("tab-done").classList.toggle("active", v === "done");
  render();
}

$("tab-unread").addEventListener("click", () => setView("unread"));
$("tab-done").addEventListener("click", () => setView("done"));
$("search").addEventListener("input", render);
browser.storage.onChanged.addListener((c, area) => { if (area === "sync" && isItemChange(c)) render(); });
render();
