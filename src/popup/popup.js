(async function () {
  const $ = (id) => document.getElementById(id);
  const s = await PA.loadSettings();

  let host = "";
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    if (/^https?:$/.test(url.protocol)) host = url.hostname.toLowerCase();
  } catch (e) { /* no tab access, that's fine */ }

  function render() {
    $("enabled").checked = s.enabled;
    $("enabledHint").textContent = s.enabled ? "Shortcuts expand as you type" : "Paused everywhere";

    const siteUsable = s.enabled && !!host;
    $("siteOn").checked = !!host && !PA.hostBlocked(host, s.blockedSites);
    $("siteOn").disabled = !siteUsable;
    $("siteRow").classList.toggle("disabled", !siteUsable);
    $("siteHint").textContent = host || "Not available on this page";
    $("siteHint").title = host;
  }

  $("enabled").addEventListener("change", (e) => {
    s.enabled = e.target.checked;
    PA.saveSettings({ enabled: s.enabled });
    render();
  });

  // "This site" on = not in the blocklist. Turning it on also clears any parent-domain entry that covers this host.
  $("siteOn").addEventListener("change", (e) => {
    const list = s.blockedSites.filter((d) => !PA.hostBlocked(host, [d]));
    if (!e.target.checked) list.push(host);
    s.blockedSites = list;
    PA.saveSettings({ blockedSites: list });
    render();
  });

  render();

  const count = s.snippets.filter((x) => x.abbr).length;
  const summary = $("summary");
  summary.textContent = `${count} snippet${count === 1 ? "" : "s"} · ${s.prefixes.length ? "Prefixes" : "No prefixes set"}`;
  for (const p of s.prefixes) {
    const c = document.createElement("code");
    c.textContent = p;
    summary.append(c);
  }

  const origins = { origins: ["<all_urls>"] };
  if (!(await browser.permissions.contains(origins))) {
    $("perm").hidden = false;
    $("grant").addEventListener("click", async () => {
      if (await browser.permissions.request(origins)) $("perm").hidden = true;
    });
  }

  $("options").addEventListener("click", () => { browser.runtime.openOptionsPage(); window.close(); });
})();
