(async function () {
  const $ = (id) => document.getElementById(id);
  const s = await PA.loadSettings();
  const save = (patch) =>
    PA.saveSettings(patch).then(() => {
      const t = $("toast");
      t.classList.add("show");
      clearTimeout(save.t);
      save.t = setTimeout(() => t.classList.remove("show"), 1500);
    });

  $("enabled").checked = s.enabled;
  $("enabled").addEventListener("change", (e) => save({ enabled: e.target.checked }));

  const count = s.snippets.filter((x) => x.abbr).length;
  $("summary").textContent = `${count} snippet${count === 1 ? "" : "s"} · prefixes: ${s.prefixes.join("  ") || "none"}`;

  let host = "";
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    if (/^https?:$/.test(url.protocol)) host = url.hostname.toLowerCase();
  } catch (e) { /* no tab access, that's fine */ }

  if (host) {
    $("host").textContent = host;
    $("siteOff").checked = PA.hostBlocked(host, s.blockedSites);
    $("siteOff").addEventListener("change", (e) => {
      const list = s.blockedSites.filter((d) => !PA.hostBlocked(host, [d]));
      if (e.target.checked) list.push(host);
      s.blockedSites = list;
      save({ blockedSites: list });
    });
  } else {
    $("siteLine").hidden = true;
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
