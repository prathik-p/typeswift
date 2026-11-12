(async function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  let state = await PA.loadSettings();
  let saveTimer = null;

  function parsePrefixes(str) {
    return [...new Set(str.split(/\s+/).filter(Boolean))];
  }

  function save(patch, immediate) {
    Object.assign(state, patch);
    clearTimeout(saveTimer);
    const run = () =>
      PA.saveSettings(patch).then(
        () => toast("Saved", "Your changes have been saved."),
        (err) => toast("Couldn't save", String(err && err.message || err), true)
      );
    if (immediate) run(); else saveTimer = setTimeout(run, 800);
    checkConflicts();
  }

  // "Saved" notice that slides in at the bottom-left of the window, then slides away by itself.
  function toast(title, msg, isError) {
    const el = $("saved");
    $("savedTitle").textContent = title;
    $("savedMsg").textContent = msg;
    el.classList.toggle("error", !!isError);
    el.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove("show"), isError ? 5000 : 2000);
  }

  function renderPrefixChips() {
    const box = $("prefixChips");
    box.innerHTML = "";
    if (!state.prefixes.length) { box.textContent = "none yet"; return; }
    for (const p of state.prefixes) {
      const c = document.createElement("code");
      c.textContent = p;
      box.appendChild(c);
    }
  }

  function renderPlaceholderExamples() {
    for (const k of ["date", "isodate", "time", "datetime", "weekday"]) {
      $("ph-" + k).textContent = PA.renderTemplate("{" + k + "}").text;
    }
  }

  function checkConflicts() {
    const seen = new Map();
    const msgs = [];
    const all = [];
    for (const s of state.snippets) {
      for (const t of PA.triggersFor(s, state.prefixes)) {
        const k = state.caseSensitive ? t : t.toLowerCase();
        if (seen.has(k)) msgs.push(`“${t}” is used by more than one snippet; the first one wins.`);
        seen.set(k, s);
        all.push(k);
      }
    }
    if (state.mode === "immediate") {
      for (const a of all) for (const b of all) {
        if (a !== b && b.startsWith(a)) msgs.push(`“${a}” will fire before you can finish typing “${b}”. Rename one, or switch to “after I type a space”.`);
      }
    }
    for (const s of state.snippets) {
      if (s.prefix !== "*" && !state.prefixes.includes(s.prefix)) {
        msgs.push(`Shortcut “${s.abbr}” uses prefix “${s.prefix}”, which isn't in your prefix list (it still works).`);
      }
    }
    $("warnings").hidden = msgs.length === 0;
    $("warnings").innerHTML = "";
    [...new Set(msgs)].forEach((m) => { const d = document.createElement("div"); d.textContent = "Warning: " + m; $("warnings").appendChild(d); });
  }

  function prefixOptions(select, current) {
    select.innerHTML = "";
    const opts = [["*", "any"], ...state.prefixes.map((p) => [p, p])];
    if (current !== "*" && !state.prefixes.includes(current)) opts.push([current, current]);
    for (const [v, label] of opts) {
      const o = document.createElement("option");
      o.value = v; o.textContent = label;
      select.appendChild(o);
    }
    select.value = current;
  }

  function renderSnippets() {
    const tbody = document.querySelector("#snippets tbody");
    tbody.innerHTML = "";
    const q = $("search").value.trim().toLowerCase();
    const list = state.snippets.filter((s) => !q || s.abbr.toLowerCase().includes(q) || s.text.toLowerCase().includes(q));
    for (const s of list) {
      const row = $("rowTpl").content.firstElementChild.cloneNode(true);
      const sel = row.querySelector(".prefix");
      prefixOptions(sel, s.prefix);
      row.querySelector(".abbr").value = s.abbr;
      row.querySelector(".text").value = s.text;
      const update = () => {
        s.prefix = sel.value;
        s.abbr = row.querySelector(".abbr").value.trim();
        s.text = row.querySelector(".text").value;
        save({ snippets: state.snippets });
      };
      row.addEventListener("input", update);
      row.addEventListener("change", update);
      row.querySelector(".del").addEventListener("click", () => {
        state.snippets = state.snippets.filter((x) => x !== s);
        save({ snippets: state.snippets }, true);
        renderSnippets();
      });
      tbody.appendChild(row);
    }
    $("empty").hidden = state.snippets.length > 0;
  }

  // Wire up controls
  $("enabled").checked = state.enabled;
  $("enabled").addEventListener("change", (e) => save({ enabled: e.target.checked }, true));

  $("prefixes").value = state.prefixes.join(" ");
  $("prefixes").addEventListener("input", (e) => {
    save({ prefixes: parsePrefixes(e.target.value) });
    renderPrefixChips();
    document.querySelectorAll("#snippets .prefix").forEach((sel) => prefixOptions(sel, sel.value));
  });

  $("mode").value = state.mode;
  $("mode").addEventListener("change", (e) => save({ mode: e.target.value }, true));
  $("caseSensitive").checked = state.caseSensitive;
  $("caseSensitive").addEventListener("change", (e) => save({ caseSensitive: e.target.checked }, true));

  $("blockedSites").value = state.blockedSites.join("\n");
  $("blockedSites").addEventListener("input", (e) =>
    save({ blockedSites: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })
  );

  $("search").addEventListener("input", renderSnippets);
  $("add").addEventListener("click", () => {
    $("search").value = "";
    state.snippets.push({ id: PA.newId(), prefix: "*", abbr: "", text: "" });
    save({ snippets: state.snippets }, true);
    renderSnippets();
    const rows = document.querySelectorAll("#snippets tbody tr");
    rows[rows.length - 1].querySelector(".abbr").focus();
  });

  $("export").addEventListener("click", () => {
    const data = { version: 1, prefixes: state.prefixes, mode: state.mode, caseSensitive: state.caseSensitive, blockedSites: state.blockedSites, snippets: state.snippets };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "prefix-autofill-backup.json" });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $("importBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.snippets)) throw new Error("No snippets found in file");
      const replace = confirm(`Import ${data.snippets.length} snippets.\n\nOK = replace your current snippets\nCancel = add them to your current snippets`);
      const incoming = data.snippets.map((s) => ({ id: PA.newId(), prefix: s.prefix ?? "*", abbr: String(s.abbr || ""), text: String(s.text || "") }));
      const patch = { snippets: replace ? incoming : state.snippets.concat(incoming) };
      if (Array.isArray(data.prefixes)) patch.prefixes = replace ? data.prefixes : [...new Set(state.prefixes.concat(data.prefixes))];
      if (replace && data.mode) patch.mode = data.mode;
      if (Array.isArray(data.blockedSites)) patch.blockedSites = [...new Set(state.blockedSites.concat(data.blockedSites))];
      await PA.saveSettings(patch);
      location.search = "?imported=" + incoming.length;
    } catch (err) {
      alert("Couldn't import: " + err.message);
    }
    e.target.value = "";
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.enabled) $("enabled").checked = changes.enabled.newValue;
  });

  renderSnippets();
  renderPrefixChips();
  renderPlaceholderExamples();
  checkConflicts();

  const imported = new URLSearchParams(location.search).get("imported");
  if (imported) {
    toast("Import complete", `${imported} snippet${imported === "1" ? "" : "s"} saved.`);
    history.replaceState(null, "", location.pathname);
  }
})();
