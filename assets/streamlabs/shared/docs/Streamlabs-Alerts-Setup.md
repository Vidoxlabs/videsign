# Streamlabs Custom Alerts Setup Guide

This guide walks you through setting up the custom Violet-themed alerts for Streamlabs. The widget files are shared across every layout profile — only the position changes per layout (see §3).

---

## 1. Quick Overview

The custom alert widget files are located in `shared/widgets/alerts/`:
- `alertbox.html` — HTML markup with approach rings, neon borders, and message slots.
- `alertbox.css` — Styling, keyframe animations, glow filters, typography, and per-alert-type accents.
- `alertbox.js` — Event parsing, token management, and the `data-type` attribute that drives the per-type accents.
- `preview.html` — Standalone interactive test bench to test all 5 alert types before streaming.

Covers Streamlabs' 5 alert event types: Follows, Subscriptions, Donations/Tips, Bits/Cheers, and Raids. All 5 share one HTML/CSS template; `alertbox.js` swaps in the category label and action text per type, and sets `data-type` on the container so the CSS can vary the ring count and accent color without duplicating markup:

| Type | Ring count | Accent |
|---|---|---|
| Follow | 1 ring | Standard palette |
| Subscriber | 2 rings | Brighter lavender ring |
| Donation / Cheer | 1 ring + amount-scaled glow | Moon White category text and card border, glow intensity scales with amount (clamped) |
| Raid | 3 rings, cascading | Full palette spread across all three rings |

---

## 2. Setting Up in Streamlabs Dashboard

1. Log in to [Streamlabs.com](https://streamlabs.com/dashboard) and navigate to **Alert Box** on the left menu.
2. Select the alert type you want to customize (**Follows**, **Subscriptions**, **Donations**, **Bits**, or **Raids**).
3. Scroll to **Custom Code**, toggle it **Enabled**. You'll see tabs for **HTML**, **CSS**, **JS**, and **Custom Fields**.
4. Paste the contents of `shared/widgets/alerts/alertbox.html` into the HTML tab, `alertbox.css` into the CSS tab, and `alertbox.js` into the JS tab, for every alert type — the same three files work for all 5, since `alertbox.js` already branches on `obj.detail.listener` to pick the right copy and `data-type`.
5. Click **Save Settings**.

If you're running the osu! preset and want the rhythm-flavored follower text back, apply the one-line swap in `presets/osu/alert-copy-overrides.md` after pasting.

---

## 3. Positioning the Alert Box

Position depends on which layout profile you're using — pick the row for your layout and use the exact `scene-layout.json` numbers, not an approximation. Add the Alert Box as a **Browser Source** (or Streamlabs' native Alert Box source) near the top of your source stack, just below the foreground/frame overlay.

| Layout | Position | Size | Why it's safe |
|---|---|---|---|
| `4x3-rail-osu` | X **1440**, Y **40** | 480×260 | Confined entirely to the right rail (X1440–1920); bottom edge (Y300) sits 30px clear of the chat interior (Y330–690). Never touches the gameplay quiet-zone (X0–1440). |
| `16x9-full` | X **680**, Y **24** | 560×200 | Top-center, clear of the bottom-left chat (X24–404, Y776–1056), bottom-right handcam (X1496–1896, Y831–1056), and the mascot perch (X1676–1896, Y521–821) — see that layout's `scene-layout.json` for the full pairwise overlap check. |

Both of these are recorded as the canonical `movingElements.alertBox` entry in each layout's `scene-layout.json` — that file, not this doc, is the source of truth if the two ever disagree.

**Note on the 16:9 layout:** there's no universally safe position across every game — some HUDs put ability bars or minimaps along the top edge. If the top-center position collides with your specific game's HUD, move the Alert Box (it's just a widget transform) to whichever corner is clear; it doesn't need to stay pinned to the coordinates above the way the mascot art does.

---

## 4. Sound Cues

The alert widget itself ships with **no bundled sound** — it's pure HTML/CSS/JS with no audio file, so this pipeline can't fabricate one for you. To add a sound cue per alert type, use Streamlabs' own **Alert Sound** upload field (below the Custom Code toggle, per alert type in the dashboard).

Suggested spec, to match the calm/late-night tone of the rest of the pack: a short chime under 1.5 seconds, peak level around -18dB (quiet — this is a background rail accent, not a klaxon), no vocal samples. Bring your own licensed sound file; Streamlabs plays it independently of the custom HTML/CSS/JS above.

---

## 5. Testing Your Alerts

1. Open `shared/widgets/alerts/preview.html` in your browser (serve it locally, e.g. `python3 -m http.server`, rather than opening via `file://`, so the HTML/JS fetch works) to view the interactive test suite — it now has a button per alert type, each demonstrating that type's ring count and accent.
2. In Streamlabs Dashboard / Desktop, use **Test Follow**, **Test Subscription**, **Test Donation**, **Test Bits**, or **Test Raid** to verify live in Streamlabs, positioned per §3 for your layout.
