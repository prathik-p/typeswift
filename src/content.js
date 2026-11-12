/* Watches typing in text fields and expands prefix shortcuts into saved text. */
(function () {
  "use strict";
  if (window.__prefixAutofillLoaded) return;
  window.__prefixAutofillLoaded = true;

  const TEXT_INPUT_TYPES = new Set(["text", "search", "email", "url", "tel", ""]);
  const DELIMITERS = new Set([" ", "\n", " "]);

  let settings = null;
  let triggerMap = new Map(); // normalized trigger -> snippet
  let maxTriggerLen = 0;
  let expanding = false;

  function rebuild() {
    triggerMap = new Map();
    maxTriggerLen = 0;
    for (const s of settings.snippets || []) {
      for (const t of PA.triggersFor(s, settings.prefixes || [])) {
        const key = settings.caseSensitive ? t : t.toLowerCase();
        if (!triggerMap.has(key)) triggerMap.set(key, s);
        maxTriggerLen = Math.max(maxTriggerLen, t.length);
      }
    }
  }

  function active() {
    return (
      settings &&
      settings.enabled &&
      triggerMap.size > 0 &&
      !PA.hostBlocked(location.hostname.toLowerCase(), settings.blockedSites || [])
    );
  }

  /** Find the longest trigger that ends exactly at the end of `before`. */
  function findTrigger(before) {
    const tail = before.slice(-maxTriggerLen);
    const hay = settings.caseSensitive ? tail : tail.toLowerCase();
    for (let len = Math.min(maxTriggerLen, hay.length); len > 0; len--) {
      const snippet = triggerMap.get(hay.slice(-len));
      if (snippet) return { snippet, length: len };
    }
    return null;
  }

  function isTextField(el) {
    if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
    if (el instanceof HTMLInputElement) {
      return TEXT_INPUT_TYPES.has((el.getAttribute("type") || "").toLowerCase()) && !el.readOnly && !el.disabled;
    }
    return false;
  }

  /** Inserts text over the current selection in a way that keeps undo and page frameworks (React etc.) happy. */
  function insertText(target, text) {
    let ok = false;
    try {
      ok = document.execCommand("insertText", false, text);
    } catch (e) {
      ok = false;
    }
    if (!ok && target && isTextField(target)) {
      target.setRangeText(text, target.selectionStart, target.selectionEnd, "end");
      target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    }
  }

  function expandInField(el) {
    const caret = el.selectionStart;
    if (caret == null || caret !== el.selectionEnd) return;
    let before = el.value.slice(0, caret);
    let delimiter = "";
    if (settings.mode === "delimiter") {
      const last = before.slice(-1);
      if (!DELIMITERS.has(last)) return;
      delimiter = last;
      before = before.slice(0, -1);
    }
    const hit = findTrigger(before);
    if (!hit) return;
    const { text, cursorBack } = PA.renderTemplate(hit.snippet.text);
    const start = before.length - hit.length;
    el.setSelectionRange(start, caret);
    insertText(el, text + delimiter);
    if (cursorBack > 0) {
      const pos = el.selectionStart - delimiter.length - cursorBack;
      el.setSelectionRange(pos, pos);
    }
  }

  function expandInEditable() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;
    const node = sel.focusNode;
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const offset = sel.focusOffset;
    let before = node.data.slice(0, offset);
    let delimiter = "";
    if (settings.mode === "delimiter") {
      const last = before.slice(-1);
      if (!DELIMITERS.has(last)) return;
      delimiter = " ";
      before = before.slice(0, -1);
    }
    const hit = findTrigger(before);
    if (!hit) return;
    const { text, cursorBack } = PA.renderTemplate(hit.snippet.text);
    const range = document.createRange();
    range.setStart(node, before.length - hit.length);
    range.setEnd(node, offset);
    sel.removeAllRanges();
    sel.addRange(range);
    insertText(null, text + delimiter);
    const back = cursorBack + delimiter.length;
    for (let i = 0; i < back; i++) sel.modify("move", "backward", "character");
  }

  function onInput(event) {
    if (expanding || !active()) return;
    // Only react to the user typing characters, not to paste/undo/our own inserts.
    const t = event.inputType || "";
    if (event.isComposing || !(t === "insertText" || t === "insertLineBreak" || t === "insertParagraph")) return;
    const el = event.target;
    expanding = true;
    try {
      if (isTextField(el)) expandInField(el);
      else if (el && el.isContentEditable) expandInEditable();
    } catch (e) {
      console.warn("[TypeSwift]", e);
    } finally {
      expanding = false;
    }
  }

  document.addEventListener("input", onInput, true);

  PA.loadSettings().then((s) => {
    settings = s;
    rebuild();
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !settings) return;
    for (const [k, v] of Object.entries(changes)) settings[k] = "newValue" in v ? v.newValue : PA.DEFAULTS[k];
    rebuild();
  });
})();
