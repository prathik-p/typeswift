/* Shared defaults and helpers, loaded by the content script, popup and options page. */
(function (root) {
  const DEFAULTS = {
    enabled: true,
    // Prefixes a shortcut may be typed with. A snippet can use any of these,
    // or be pinned to a single one.
    prefixes: [";", "//"],
    // "immediate": expand as soon as the full shortcut is typed.
    // "delimiter": expand only after you type a space or Enter after it.
    mode: "immediate",
    caseSensitive: false,
    blockedSites: [],
    snippets: [
      { id: "s1", prefix: "*", abbr: "addr", text: "221B Baker Street\nLondon NW1 6XE" },
      { id: "s2", prefix: "*", abbr: "sig", text: "Best regards,\nJohn" },
      { id: "s3", prefix: ";", abbr: "date", text: "{date}" },
      { id: "s4", prefix: "*", abbr: "ty", text: "Thanks for reaching out! {cursor}" }
    ]
  };

  async function loadSettings() {
    const stored = await browser.storage.local.get(null);
    return Object.assign({}, DEFAULTS, stored);
  }

  function saveSettings(patch) {
    return browser.storage.local.set(patch);
  }

  function newId() {
    return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /** Every full trigger string ("prefix + abbr") a snippet answers to. */
  function triggersFor(snippet, prefixes) {
    if (!snippet.abbr) return [];
    if (snippet.prefix === "*") return prefixes.map((p) => p + snippet.abbr);
    return [(snippet.prefix || "") + snippet.abbr];
  }

  /** Replace {date}, {time}, {datetime}, {weekday}; returns {text, cursorOffset}. */
  function renderTemplate(text) {
    const now = new Date();
    const out = text
      .replace(/\{date\}/g, now.toLocaleDateString())
      .replace(/\{time\}/g, now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
      .replace(/\{datetime\}/g, now.toLocaleString())
      .replace(/\{weekday\}/g, now.toLocaleDateString([], { weekday: "long" }))
      .replace(/\{isodate\}/g, now.toISOString().slice(0, 10));
    const idx = out.indexOf("{cursor}");
    if (idx === -1) return { text: out, cursorBack: 0 };
    const finalText = out.slice(0, idx) + out.slice(idx + 8).replace(/\{cursor\}/g, "");
    return { text: finalText, cursorBack: finalText.length - idx };
  }

  function hostBlocked(host, list) {
    return list.some((entry) => {
      entry = entry.trim().toLowerCase();
      return entry && (host === entry || host.endsWith("." + entry));
    });
  }

  root.PA = { DEFAULTS, loadSettings, saveSettings, newId, triggersFor, renderTemplate, hostBlocked };
})(typeof window !== "undefined" ? window : self);
