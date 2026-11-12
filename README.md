# TypeSwift (Firefox)

Type a prefix plus a shortcut, like `;addr`, in any text box and it is replaced with your saved text.
Works in normal inputs, textareas and rich-text editors (Gmail, Slack web, Notion, etc.).

## Features
- **Custom prefixes:** use any number of prefixes (`;`, `//`, `!!`, `::`…). Each snippet can answer to *any* prefix or be pinned to one.
- **Two expansion modes:** instantly when the shortcut is complete, or only after you type a space/Enter.
- **Placeholders:** `{date}`, `{isodate}`, `{time}`, `{datetime}`, `{weekday}`, and `{cursor}` to choose where the caret lands.
- **Per-site off switch** from the toolbar popup, plus a blocklist in settings.
- Conflict warnings (duplicate shortcuts, or `;ad` blocking `;addr` in instant mode).
- Import/export to a JSON file. Ctrl+Z undoes an expansion. Password fields are never touched.
- Everything stays local in your browser (`storage.local`). No network access, no tracking.

## Prerequisites

| What | Needed for | Notes |
|---|---|---|
| **Firefox 115 or newer** (desktop) | Running it | 115 ESR works; any current release is fine. Check in *Menu → Help → About Firefox*. |
| A text editor | Editing snippets defaults or code | Optional; snippets are managed in the settings page. |
| **Node.js 18+ and npm** | `web-ext` dev tool | Optional for just trying it; needed for live-reload, lint, build and signing. |
| **web-ext** (`npm install` in this folder) | Run / lint / package / sign | Mozilla's official CLI. Installed as a dev dependency. |
| **Firefox Add-ons (AMO) account** + API key/secret | Permanent install in normal Firefox | Free. Create keys at https://addons.mozilla.org/developers/addon/api/key/ |

Why signing matters: regular Firefox (Release/Beta) only keeps **signed** add-ons installed permanently.
An unsigned add-on can be loaded temporarily (until Firefox restarts), or permanently only in
**Firefox Developer Edition / Nightly / ESR** with `xpinstall.signatures.required = false` in `about:config`.

## Install options

### 1. Try it now (temporary, no tools needed)
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick `src/manifest.json`.
3. Click the toolbar icon. If it says access to websites isn't granted, click **Allow on all websites**
   (or go to `about:addons` → TypeSwift → Permissions → enable "Access your data for all websites").
4. Open the settings page from the popup and set up your prefixes and snippets.

It stays loaded until you restart Firefox.

### 2. Develop with live reload
```bash
npm install
npm start        # opens a fresh Firefox profile with the extension; reloads on file save
npm run lint     # Mozilla's validator
```

### 3. Permanent install (recommended) — self-distributed, signed by Mozilla
"Unlisted" signing gives you a signed `.xpi` for your own use; it isn't published on the store and is usually approved automatically within minutes.
1. The add-on ID in `src/manifest.json` is `typeswift@prathik-p`. Keep it the same forever: Firefox uses it to recognise updates.
2. Get an API key and secret from https://addons.mozilla.org/developers/addon/api/key/
3. Run:
   ```bash
   npm install
   npx web-ext sign --source-dir src --artifacts-dir dist --channel unlisted \
     --api-key "$AMO_JWT_ISSUER" --api-secret "$AMO_JWT_SECRET"
   ```
4. Drag the `.xpi` from `dist/` onto a Firefox window (or *about:addons → ⚙ → Install Add-on From File*).
5. To update later, bump `"version"` in the manifest and sign again.

### 4. Unsigned permanent install (Developer Edition / Nightly only)
Set `xpinstall.signatures.required` to `false` in `about:config`, run `npm run build`,
rename the zip in `dist/` to `.xpi`, and install it from file.

## Using it
- Default prefixes are `;` and `//`, so `;addr` and `//addr` both work for snippets set to "any".
- Sample snippets: `addr`, `sig`, `ty` (with `{cursor}`), and `;date`. Edit or delete them in settings.
- Single-line inputs flatten line breaks into spaces; that's the browser, not the extension.
- In instant mode, avoid shortcuts that are the start of another one (the settings page warns you).

## Known limits
- Firefox doesn't let extensions run on `about:` pages, `addons.mozilla.org`, or the PDF viewer.
- Google Docs uses a custom canvas editor, so expansion doesn't work inside Docs (Gmail, Sheets cells and most other editors are fine).
- Storage is per Firefox profile. Use Export/Import to move snippets between computers.

## Files
```
src/manifest.json      Manifest V3 definition
src/shared.js          defaults + helpers (prefix matching, placeholders)
src/content.js         watches typing and performs the expansion
src/options/           settings page (prefixes, snippets, blocklist, backup, test area)
src/popup/             toolbar popup (on/off, per-site off, permission prompt)
store-assets/          icon and screenshots for the Firefox Add-ons listing
```

## Changelog
- **1.1.0** — Renamed to TypeSwift. Settings page has a short intro, highlighted prefix and blocklist instructions, a live list of your prefixes, an expandable placeholder guide, and a "Saved" notice that slides in at the bottom-left after every change.
- **1.0.0** — First version.

## License
MIT. See [LICENSE](LICENSE).
