# Pen Guard

An Obsidian plugin that stops **S Pen strokes from triggering Obsidian's swipe gestures** on Android tablets: the sidebar drawers, the pull-down command palette, and the half-open "glitch" drawer.

> **Status: experimental.** This was written to fix a real annoyance, but it has not been tested across devices or Obsidian versions. See [Limitations](#limitations) and please report what happens on your device.

---

## The problem: S Pen + Obsidian is a nightmare

Writing with an S Pen in Obsidian on an Android tablet should be simple. It isn't.

Every time the pen moves near the edge of the screen, Obsidian treats it like a finger swipe:

- the **left or right sidebar** slides open while you're writing,
- the **command palette / quick switcher** pops up when your hand moves downward,
- and often the drawer only opens **halfway**, then snaps back, so the screen glitches mid-stroke.

On an **iPad with an Apple Pencil, the exact same Obsidian behaves perfectly.** The pencil is recognised as a pencil, the swipe gestures stay out of the way, and you just write. On Android, the S Pen seems to reach Obsidian's gesture code as plain touch input, so it gets handled like a finger.

CSS can't fix this. Obsidian's gestures are handled in JavaScript touch listeners, and CSS has no way to tell a pen from a finger. Obsidian also has no setting to turn off only the sidebar swipe. So this plugin adds the missing pen/finger distinction.

## What it does

- Detects when the pen is touching the screen and **swallows the touch events** Obsidian's swipe detection depends on, so drawers and the pull-down gesture never start.
- Also checks `touchType === "stylus"`, which some Android WebViews use instead of pointer-event pen reporting.
- Blocks the **whole stroke** from start to finish, so there's no half-open drawer.
- Leaves **finger gestures untouched**. You can still swipe with a finger or tap the sidebar button.
- Optional **edge guard** (palm rejection): while the pen is active or hovering, ignore touches that start near the left or right edge. Useful if your resting palm is what opens the sidebar.

## How it works

Pointer events know the input type (`pointerType === "pen"`), but touch events don't, and Obsidian's gesture code listens to touch events. Pointer events fire *before* touch events for the same contact, so the plugin:

1. Listens (capture phase, on `window`) for pen pointer events and remembers whether a pen is down or recently active.
2. Listens (capture phase, on `window`) for `touchstart`, `touchmove`, `touchend` and `touchcancel`.
3. Calls `stopImmediatePropagation()` on those touch events while the pen is active, so Obsidian's own listeners never see them.

Everything is registered through Obsidian's `registerDomEvent`, so it's removed cleanly when the plugin is disabled.

## Installation

### Manual

1. Download `pen-guard.zip` (or the release assets) and unzip it.
2. Copy the `pen-guard` folder into your vault at `.obsidian/plugins/pen-guard/`. It must contain `main.js` and `manifest.json`.
3. In Obsidian: **Settings → Community plugins**, reload, and enable **Pen Guard**.

> On Android, the `.obsidian` folder may not be reachable from a file manager. If so, add the files on a PC and let your sync (Obsidian Sync, Syncthing, etc.) bring them to the tablet.

### With BRAT

1. Install the **BRAT** community plugin.
2. Run **BRAT: Add a beta plugin for testing** and paste this repo's URL.
3. Enable **Pen Guard** in Community plugins.


## Settings

| Setting | Default | What it does |
|---|---|---|
| Enable Pen Guard | on | Master switch. |
| Edge guard (palm rejection) | off | While the pen is active, ignore touches starting within the edge zone. |
| Edge width (px) | 40 | Size of the left/right edge zone. |
| Pen activity window (ms) | 2000 | How long after the last pen activity the edge guard stays armed. |

## Troubleshooting

**The sidebar still opens while I write.**
- Your resting *palm* may be the cause rather than the pen. Turn on **Edge guard** and try a wider edge zone.
- Confirm the plugin is enabled and restart Obsidian fully.
- Obsidian or your WebView version may register gestures in a way this approach can't intercept. Open an issue with your device, Android version and Obsidian version.

**The pen stopped scrolling or selecting text.**
- Blocking touch events can affect pen scrolling. Open an issue describing what broke; the script can be narrowed to the screen edges only.

**Finger swipes stopped working.**
- This shouldn't happen. Disable edge guard first; if it persists, open an issue.

## Limitations

- **Untested broadly.** Behavior may differ by tablet model, Android version, Samsung One UI version, Obsidian version and WebView version.
- It works by intercepting touch events. It can't change how Obsidian handles gestures internally, and if a future Obsidian version moves gesture handling to pointer events, this approach may need updating.
- The ideal fix belongs in Obsidian itself (treating stylus input like the iPad does). If you're affected, please also report it to Obsidian.


## Development

No build step. The plugin is plain JavaScript:

```
pen-guard/
├── main.js
├── manifest.json
├── versions.json
├── README.md
└── LICENSE
```


## License

MIT, see [LICENSE](LICENSE).
