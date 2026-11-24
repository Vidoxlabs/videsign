#!/usr/bin/env python3
# Copyright (c) 2026 Vidoxlabs LLC. See LICENSE at the repository root.
"""Build Vidoxlabs family README banners and social cards.

Hand-constructed SVG (outlined Geist, line-drawn glyphs). No network, no
raster generation models. Run from this folder with --geist.
"""

# Reproduces SHA256SUMS with Google Chrome 156.0.8078.47, fontTools 4.65.0,
# Pillow 13.0.0 and Geist 1.800. Other Chrome versions can change PNG bytes;
# SVGs do not depend on Chrome.

from __future__ import annotations

import argparse
import hashlib
import math
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
# In videsign this folder is brand/repo-banners/, so the brand masters are one level up.
VIDESIGN_BRAND = ROOT.parent
GEIST_VAR: Path | None = None
CHROME = shutil.which("google-chrome") or shutil.which("chromium")

# Brand fields and neutrals. Artefacts that carry the mark or wordmark
# use these, not the DESIGN.md product-UI surfaces.
FIELD_DARK = "#121214"            # brand-field-dark
FIELD_LIGHT = "#F7F7F5"           # brand-field-light
INK_ON_DARK = "#F7F7F5"           # title and glyph on dark
INK_ON_LIGHT = "#121214"          # title and glyph on light
TAG_ON_DARK = "#A1A1AA"           # tagline on dark
TAG_ON_LIGHT = "#475569"          # tagline on light
VIOLET = "#8B5CF6"
WISTERIA = "#B4A7F2"
XYLIA = "#D92B3A"
YARROW = "#F0A020"
ZINNIA = "#E13D9E"
FIVE_BAR = (VIOLET, WISTERIA, XYLIA, YARROW, ZINNIA)

BANNER_W, BANNER_H = 1280, 320
SOCIAL_W, SOCIAL_H = 1280, 640

REPOS = [
    {
        "id": "seed",
        "name": "Seed",
        "tagline": "Contracts and schemas for the runtime",
        "alt": "Seed banner: a seed with a vertical contract seam, and the tagline Contracts and schemas for the runtime.",
    },
    {
        "id": "bloom",
        "name": "Bloom",
        "tagline": "Workspace, CLI, and terminal UI",
        "alt": "Bloom banner: an opened five-petal flower, and the tagline Workspace, CLI, and terminal UI.",
    },
    {
        "id": "capillary",
        "name": "Capillary",
        "tagline": "Context with its sources attached",
        "alt": "Capillary banner: branching capillary veins, and the tagline Context with its sources attached.",
    },
    {
        "id": "drosera",
        "name": "Drosera",
        "tagline": "Tools, skills, hooks, and cookbooks",
        "alt": "Drosera banner: sundew tendrils ending in small hooks, and the tagline Tools, skills, hooks, and cookbooks.",
    },
    {
        "id": "aestivation",
        "name": "Aestivation",
        "tagline": "Plans, verdicts, and the assembly gate",
        "alt": "Aestivation banner: a closed bud with wrapping sepals, and the tagline Plans, verdicts, and the assembly gate.",
    },
    {
        "id": "myosotis",
        "name": "Myosotis",
        "tagline": "Memory that keeps only what you allow",
        "alt": "Myosotis banner: a five-petal forget-me-not, and the tagline Memory that keeps only what you allow.",
    },
    {
        "id": "trellis",
        "name": "Trellis",
        "tagline": "Multi-point tests for the family",
        "alt": "Trellis banner: a lattice with five check-points, and the tagline Multi-point tests for the family.",
    },
    {
        "id": "docs",
        "name": "Docs",
        "tagline": "The documentation hub",
        "alt": "Docs banner: a leaf that also reads as a page, and the tagline The documentation hub.",
    },
]


def n(v: float) -> str:
    s = f"{v:.2f}"
    if s.endswith(".00"):
        return s[:-3]
    if s.endswith("0") and "." in s:
        s = s[:-1]
    return s


def compact_d(d: str) -> str:
    def repl(m: re.Match[str]) -> str:
        return n(float(m.group()))
    return re.sub(r"-?\d+\.\d+", repl, d)


class Typefaces:
    def __init__(self) -> None:
        raw = TTFont(GEIST_VAR)
        self.fonts: dict[int, TTFont] = {}
        self.glyphs: dict[int, object] = {}
        self.cmap: dict[int, dict] = {}
        self.upem: dict[int, int] = {}
        for weight in (400, 600):
            inst = instantiateVariableFont(
                TTFont(GEIST_VAR), {"wght": weight}, overlap=True, updateFontNames=False
            )
            self.fonts[weight] = inst
            self.glyphs[weight] = inst.getGlyphSet()
            self.cmap[weight] = inst.getBestCmap()
            self.upem[weight] = inst["head"].unitsPerEm
        self.cap_em = 0.71  # OS/2 sCapHeight / unitsPerEm

    def layout(self, text: str, size: float, weight: int, tracking_em: float = 0.0) -> tuple[str, float, float, float]:
        """Return (combined path d, width, ascender_px, descender_px) in a y-down
        space with origin at the left on the baseline (y=0)."""
        gs = self.glyphs[weight]
        cmap = self.cmap[weight]
        upem = self.upem[weight]
        scale = size / upem
        x = 0.0
        chunks: list[str] = []
        for i, ch in enumerate(text):
            name = cmap.get(ord(ch))
            if name is None:
                raise SystemExit(f"Geist is missing {ch!r}")
            glyph = gs[name]
            pen = SVGPathPen(gs)
            # Font y-up, SVG y-down: scale_y is negative. Baseline at y=0.
            tp = TransformPen(pen, Transform(scale, 0, 0, -scale, x, 0))
            glyph.draw(tp)
            d = compact_d(pen.getCommands())
            if d:
                chunks.append(d)
            x += glyph.width * scale
            if i < len(text) - 1:
                x += tracking_em * size
        # typographic extents
        asc = 1.005 * size
        desc = 0.295 * size
        return " ".join(chunks), x, asc, desc


FACES: Typefaces | None = None


def path_el(d: str, fill: str | None = None, stroke: str | None = None, width: float | None = None) -> str:
    attrs = [f'd="{d}"']
    if stroke:
        attrs.append('fill="none"')
        attrs.append(f'stroke="{stroke}"')
        attrs.append(f'stroke-width="{n(width or 2)}"')
        attrs.append('stroke-linecap="round"')
        attrs.append('stroke-linejoin="round"')
    else:
        attrs.append(f'fill="{fill}"')
    return f"<path {' '.join(attrs)}/>"


def rect_el(x: float, y: float, w: float, h: float, fill: str, rx: float = 0) -> str:
    bits = f'<rect x="{n(x)}" y="{n(y)}" width="{n(w)}" height="{n(h)}" fill="{fill}"'
    if rx:
        bits += f' rx="{n(rx)}"'
    return bits + "/>"


def circle_d(cx: float, cy: float, r: float) -> str:
    k = 0.552284749831 * r
    return compact_d(
        f"M{cx - r} {cy} "
        f"C{cx - r} {cy - k} {cx - k} {cy - r} {cx} {cy - r} "
        f"C{cx + k} {cy - r} {cx + r} {cy - k} {cx + r} {cy} "
        f"C{cx + r} {cy + k} {cx + k} {cy + r} {cx} {cy + r} "
        f"C{cx - k} {cy + r} {cx - r} {cy + k} {cx - r} {cy}Z"
    )


def oval_d(cx: float, cy: float, rx: float, ry: float, angle: float = 0) -> str:
    a = math.radians(angle)
    ca, sa = math.cos(a), math.sin(a)

    def pt(x: float, y: float) -> tuple[float, float]:
        return cx + x * ca - y * sa, cy + x * sa + y * ca

    k = 0.552284749831
    pts = [
        (0, -ry),
        (k * rx, -ry),
        (rx, -k * ry),
        (rx, 0),
        (rx, k * ry),
        (k * rx, ry),
        (0, ry),
        (-k * rx, ry),
        (-rx, k * ry),
        (-rx, 0),
        (-rx, -k * ry),
        (-k * rx, -ry),
    ]
    t = [pt(x, y) for x, y in pts]
    return compact_d(
        f"M{t[0][0]} {t[0][1]} "
        f"C{t[1][0]} {t[1][1]} {t[2][0]} {t[2][1]} {t[3][0]} {t[3][1]} "
        f"C{t[4][0]} {t[4][1]} {t[5][0]} {t[5][1]} {t[6][0]} {t[6][1]} "
        f"C{t[7][0]} {t[7][1]} {t[8][0]} {t[8][1]} {t[9][0]} {t[9][1]} "
        f"C{t[10][0]} {t[10][1]} {t[11][0]} {t[11][1]} {t[0][0]} {t[0][1]}Z"
    )


def map_pt(unit: float, origin: tuple[float, float], x: float, y: float) -> tuple[float, float]:
    ox, oy = origin
    return ox + x * unit, oy + y * unit


def glyph_elements(repo_id: str, x: float, y: float, size: float, ink: str) -> str:
    """Line-drawn botanic glyph in a square of `size`, top-left (x, y).

    Designed on a 64-unit grid with a 6-unit inset. Stroke is size/40.
    """
    u = size / 64.0
    sw = size / 40.0
    ox, oy = x, y

    def P(px: float, py: float) -> tuple[float, float]:
        return ox + px * u, oy + py * u

    def L(x1: float, y1: float, x2: float, y2: float) -> str:
        a, b = P(x1, y1)
        c, d = P(x2, y2)
        return path_el(f"M{n(a)} {n(b)}L{n(c)} {n(d)}", stroke=ink, width=sw)

    def D(d: str) -> str:
        return path_el(d, stroke=ink, width=sw)

    def C(cx: float, cy: float, r: float) -> str:
        px, py = P(cx, cy)
        return D(circle_d(px, py, r * u))

    def Ov(cx: float, cy: float, rx: float, ry: float, angle: float = 0) -> str:
        px, py = P(cx, cy)
        return D(oval_d(px, py, rx * u, ry * u, angle))

    if repo_id == "seed":
        # Fuller pointed almond with a longer contract seam, filling more of
        # the inset so the mark is not the lightest in the set.
        a, b = P(32, 8), P(32, 56)
        c1, c2 = P(52, 18), P(52, 46)
        c3, c4 = P(12, 46), P(12, 18)
        almond = compact_d(
            f"M{a[0]} {a[1]}C{c1[0]} {c1[1]} {c2[0]} {c2[1]} {b[0]} {b[1]}"
            f"C{c3[0]} {c3[1]} {c4[0]} {c4[1]} {a[0]} {a[1]}Z"
        )
        return D(almond) + L(32, 18, 32, 48)

    if repo_id == "bloom":
        # Open flower: long pointed petals, small centre. Distinct from myosotis.
        # Petal span stays inside the 6-unit inset (live ≈25.2 units from centre).
        parts = [C(32, 32, 4.2)]
        for angle in (-90, -18, 54, 126, 198):
            a = math.radians(angle)
            cx = 32 + 14.6 * math.cos(a)
            cy = 32 + 14.6 * math.sin(a)
            parts.append(Ov(cx, cy, 4.8, 10.4, angle + 90))
        return "".join(parts)

    if repo_id == "myosotis":
        # Forget-me-not: notched (slightly heart-shaped) petals and a clear eye,
        # so it does not read as a smaller Bloom.
        def notched(angle: float) -> str:
            a = math.radians(angle)
            ca, sa = math.cos(a), math.sin(a)
            px, py = -sa, ca

            def pol(dist: float, off: float = 0.0) -> tuple[float, float]:
                return P(32 + dist * ca + off * px, 32 + dist * sa + off * py)

            base = pol(5.8)
            left = pol(18.5, -6.2)
            right = pol(18.5, 6.2)
            notch = pol(15.0)
            # Controls keep the lobes round and the notch shallow.
            return D(compact_d(
                f"M{base[0]} {base[1]} "
                f"C{pol(10, -4)[0]} {pol(10, -4)[1]} {pol(15, -7)[0]} {pol(15, -7)[1]} {left[0]} {left[1]} "
                f"C{pol(17.2, -2.2)[0]} {pol(17.2, -2.2)[1]} {pol(16.2, -0.8)[0]} {pol(16.2, -0.8)[1]} {notch[0]} {notch[1]} "
                f"C{pol(16.2, 0.8)[0]} {pol(16.2, 0.8)[1]} {pol(17.2, 2.2)[0]} {pol(17.2, 2.2)[1]} {right[0]} {right[1]} "
                f"C{pol(15, 7)[0]} {pol(15, 7)[1]} {pol(10, 4)[0]} {pol(10, 4)[1]} {base[0]} {base[1]}Z"
            ))
        return "".join(notched(ang) for ang in (-90, -18, 54, 126, 198)) + C(32, 32, 5.0)

    if repo_id == "trellis":
        parts = [
            L(18, 14, 18, 50),
            L(32, 14, 32, 50),
            L(46, 14, 46, 50),
            L(14, 18, 50, 18),
            L(14, 32, 50, 32),
            L(14, 46, 50, 46),
        ]
        for cx, cy in ((18, 18), (46, 18), (32, 32), (18, 46), (46, 46)):
            parts.append(C(cx, cy, 2.6))
        return "".join(parts)

    if repo_id == "drosera":
        def curve_to_rim(x1, y1, cx, cy, x2, y2, r) -> str:
            # End the tendril on the gland rim, not at its centre.
            dx, dy = x2 - cx, y2 - cy
            # The last control is cx,cy; the end is the gland. Approach from the
            # start point's direction: from (x1,y1) toward (x2,y2).
            vx, vy = x2 - x1, y2 - y1
            mag = math.hypot(vx, vy) or 1
            ex, ey = x2 - vx / mag * r, y2 - vy / mag * r
            a = P(x1, y1)
            c = P(cx, cy)
            b = P(ex, ey)
            return path_el(
                f"M{n(a[0])} {n(a[1])}Q{n(c[0])} {n(c[1])} {n(b[0])} {n(b[1])}",
                stroke=ink,
                width=sw,
            )
        return (
            Ov(26, 51, 8.0, 3.4, -6)
            + curve_to_rim(20, 49, 12, 34, 14, 16, 2.8)
            + curve_to_rim(26, 48, 28, 28, 36, 12, 3.2)
            + curve_to_rim(30, 50, 42, 42, 52, 30, 2.6)
            + C(14, 16, 2.8)
            + C(36, 12, 3.2)
            + C(52, 30, 2.6)
        )

    if repo_id == "aestivation":
        # Closed inner bud, with two open sepal strokes wrapping it (not a Venn).
        def sepal(sign: float) -> str:
            # Open C-curve from the base, around the side, to near the tip.
            start = P(32 + sign * 3, 50)
            mid = P(32 + sign * 18, 32)
            end = P(32 + sign * 4, 12)
            c1 = P(32 + sign * 8, 50)
            c2 = P(32 + sign * 22, 44)
            c3 = P(32 + sign * 22, 18)
            c4 = P(32 + sign * 8, 12)
            return D(compact_d(
                f"M{start[0]} {start[1]} "
                f"C{c1[0]} {c1[1]} {c2[0]} {c2[1]} {mid[0]} {mid[1]} "
                f"C{c3[0]} {c3[1]} {c4[0]} {c4[1]} {end[0]} {end[1]}"
            ))
        return sepal(-1) + sepal(1) + Ov(32, 32, 6.4, 17.5, 0)

    if repo_id == "capillary":
        # One trunk (midrib) dividing into finer veins. Two laterals each
        # split once. Same stroke and 64-unit box as the other glyphs.
        def Q(x1, y1, cx, cy, x2, y2) -> str:
            a, c, d = P(x1, y1), P(cx, cy), P(x2, y2)
            return path_el(
                f"M{n(a[0])} {n(a[1])}Q{n(c[0])} {n(c[1])} {n(d[0])} {n(d[1])}",
                stroke=ink,
                width=sw,
            )
        def cubic(x1, y1, c1x, c1y, c2x, c2y, x2, y2) -> str:
            a, q, r, d = P(x1, y1), P(c1x, c1y), P(c2x, c2y), P(x2, y2)
            return path_el(
                f"M{n(a[0])} {n(a[1])}C{n(q[0])} {n(q[1])} {n(r[0])} {n(r[1])} {n(d[0])} {n(d[1])}",
                stroke=ink,
                width=sw,
            )
        # Midrib attachments at t=0.20 and t=0.50. Tips sit inside the
        # 6-unit inset, including stroke.
        return (
            cubic(32, 55, 32, 44, 31.5, 26, 30, 10)
            + Q(31.92, 48.14, 18, 42, 11, 30)
            + Q(11, 30, 8, 20, 9, 12)
            + Q(11, 30, 18, 20, 20, 12)
            + Q(31.44, 34.25, 46, 28, 53, 20)
            + Q(53, 20, 56, 14, 55, 10)
            + Q(53, 20, 48, 12, 42, 10)
        )

    if repo_id == "docs":
        # A leaf (pointed tip, short petiole) with a midrib and three laterals,
        # so it also reads as a page of lines. Not an oval: that was too close to seed.
        # Asymmetric leaf: tighter left margin, fuller right, longer petiole,
        # laterals only on the right, so it does not read as Seed at small size.
        tip, base = P(30, 8), P(32, 50)
        lc1, lc2 = P(22, 14), P(18, 42)
        rc1, rc2 = P(50, 12), P(54, 44)
        leaf = compact_d(
            f"M{tip[0]} {tip[1]}C{lc1[0]} {lc1[1]} {lc2[0]} {lc2[1]} {base[0]} {base[1]}"
            f"C{rc2[0]} {rc2[1]} {rc1[0]} {rc1[1]} {tip[0]} {tip[1]}Z"
        )
        return (
            D(leaf)
            + L(32, 50, 32, 56)
            + L(32, 14, 32, 48)
            + L(32, 22, 46, 18)
            + L(32, 32, 48, 32)
            + L(32, 42, 45, 46)
        )

    raise SystemExit(f"unknown glyph {repo_id}")


def inner_svg(path: Path) -> str:
    text = path.read_text(encoding="utf-8").strip()
    m = re.search(r"<svg[^>]*>(.*)</svg>", text, re.S)
    if not m:
        raise SystemExit(f"could not read {path.name}")
    return m.group(1)


def placed_master(
    filename: str,
    x: float,
    y: float,
    width: float,
    vb_x: float,
    vb_y: float,
    vb_w: float,
    vb_h: float,
) -> str:
    """Place a brand master unmodified at (x, y) with the given CSS width.

    Height follows the master's aspect. Inner path data is copied verbatim.
    """
    inner = inner_svg(VIDESIGN_BRAND / filename)
    s = width / vb_w
    # Keep enough decimals that rendered size meets the master's minimum
    # (n() would round 48/38 to 1.26 and fall 0.12px short of 48).
    def q(v: float) -> str:
        s = f"{v:.5f}".rstrip("0").rstrip(".")
        return s or "0"
    return (
        f'<g transform="translate({q(x)} {q(y)}) scale({q(s)}) '
        f'translate({q(-vb_x)} {q(-vb_y)})">'
        f"{inner}</g>"
    )


def placed_header_mark(x: float, y: float, size: float) -> str:
    # brand_mark_header_v008.svg viewBox="5 5 38 38", minimum 38px.
    return placed_master("brand_mark_header_v008.svg", x, y, size, 5, 5, 38, 38)


def placed_mono_dark_mark(x: float, y: float, size: float) -> str:
    # brand_mark_mono-dark_v008.svg viewBox="-16.889 -16.889 81.778 81.778".
    return placed_master(
        "brand_mark_mono-dark_v008.svg", x, y, size, -16.889, -16.889, 81.778, 81.778
    )


def placed_horizontal_lockup(x: float, y: float, dark_field: bool) -> str:
    # Canon horizontal lockup at its own 226x82 minimum, unmodified.
    name = (
        "brand_lockup_horizontal-dark_v004.svg"
        if dark_field
        else "brand_lockup_horizontal-light_v005.svg"
    )
    return placed_master(name, x, y, 226, -14.476, -17, 226, 82)


def five_bar(x: float, y: float, bar_w: float, bar_h: float, gap: float) -> str:
    parts = []
    for i, color in enumerate(FIVE_BAR):
        bx = x + i * (bar_w + gap)
        parts.append(rect_el(bx, y, bar_w, bar_h, color, rx=bar_h / 2))
    return "".join(parts)


def five_bar_block(x: float, y: float, dark_field: bool) -> tuple[str, float, float]:
    """Draw the five-bar with a stable origin.

    `x, y` is always the origin of the bars themselves, so light and dark
    variants line up under a prefers-color-scheme swap. On a light field the
    #121214 chip is outdented around that origin (Wisteria and Yarrow fail
    3:1 on #F7F7F5). The returned height is the bar height, not the chip.
    """
    bar_w, bar_h, gap = 28, 5, 3
    pad_x, pad_y = 8, 6
    inner_w = 5 * bar_w + 4 * gap
    if dark_field:
        return five_bar(x, y, bar_w, bar_h, gap), inner_w, bar_h
    chip = rect_el(x - pad_x, y - pad_y, inner_w + 2 * pad_x, bar_h + 2 * pad_y, FIELD_DARK, rx=4)
    bars = five_bar(x, y, bar_w, bar_h, gap)
    return chip + bars, inner_w, bar_h


def text_path(text: str, x: float, baseline: float, size: float, weight: int, fill: str, tracking_em: float = 0.0) -> tuple[str, float]:
    d, width, _asc, _desc = FACES.layout(text, size, weight, tracking_em)
    # layout origin is baseline y=0; shift to (x, baseline)
    # Path coordinates are already in pixels; prepend a translate via wrapping group.
    el = f'<g transform="translate({n(x)} {n(baseline)})">{path_el(d, fill=fill)}</g>'
    return el, width


def theme_colors(dark: bool) -> dict[str, str]:
    if dark:
        return {
            "field": FIELD_DARK,
            "title": INK_ON_DARK,
            "tag": TAG_ON_DARK,
            "ink": INK_ON_DARK,
        }
    return {
        "field": FIELD_LIGHT,
        "title": INK_ON_LIGHT,
        "tag": TAG_ON_LIGHT,
        "ink": INK_ON_LIGHT,
    }


def banner_svg(repo: dict, dark: bool) -> str:
    c = theme_colors(dark)
    w, h = BANNER_W, BANNER_H
    margin = 80
    title_size = 64
    tag_size = 22
    slot = 82  # reserved mark column; title starts after this on both fields
    header_size = 48
    mono_size = 82
    mark_size = header_size if dark else mono_size
    glyph_size = 200
    gap_mark = 20
    gap_title_tag = 18

    _, _, _, tag_desc = FACES.layout(repo["tagline"], tag_size, 400, 0)
    _, _, bar_h = five_bar_block(0, 0, dark)

    # Same title origin on light and dark, so the five-bar does not jump.
    text_x = margin + slot + gap_mark
    title_cap = FACES.cap_em * title_size
    title_baseline = 0.0
    tag_baseline = title_baseline + gap_title_tag + FACES.cap_em * tag_size
    bar_y = tag_baseline + tag_desc + 16
    # Chip outdent is visual only; stack height uses the bar itself.
    stack_top = title_baseline - title_cap
    stack_bot = bar_y + bar_h
    shift = (h - (stack_bot - stack_top)) / 2 - stack_top
    title_baseline += shift
    tag_baseline += shift
    bar_y += shift

    mark_y = title_baseline - title_cap + (title_cap - mark_size) / 2
    # Right-align the mark in the reserved slot so the gap to the title is 20px.
    mark_x = margin + slot - mark_size
    glyph_x = w - margin - glyph_size
    glyph_y = (h - glyph_size) / 2

    if dark:
        mark = placed_header_mark(mark_x, mark_y, mark_size)
    else:
        mark = placed_mono_dark_mark(mark_x, mark_y, mark_size)

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">',
        rect_el(0, 0, w, h, c["field"]),
        mark,
        text_path(repo["name"], text_x, title_baseline, title_size, 600, c["title"], -0.02)[0],
        text_path(repo["tagline"], text_x, tag_baseline, tag_size, 400, c["tag"], 0)[0],
        five_bar_block(text_x, bar_y, dark)[0],
        glyph_elements(repo["id"], glyph_x, glyph_y, glyph_size, c["ink"]),
        "</svg>\n",
    ]
    return "".join(parts)


def social_svg(repo: dict, dark: bool) -> str:
    c = theme_colors(dark)
    w, h = SOCIAL_W, SOCIAL_H
    margin = 96
    title_size = 80
    tag_size = 26
    glyph_size = 280
    lockup_w, lockup_h = 226, 82

    title_cap = FACES.cap_em * title_size
    tag_cap = FACES.cap_em * tag_size
    _, _, _, tag_desc = FACES.layout(repo["tagline"], tag_size, 400, 0)
    _, _, bar_h = five_bar_block(0, 0, dark)

    # Canonical horizontal lockup at its own minimum, top-left on the margin.
    lockup_x, lockup_y = margin, margin

    text_x = margin
    gap_title_tag = 22
    stack_h = title_cap + gap_title_tag + tag_cap + tag_desc + 18 + bar_h
    area_top = lockup_y + lockup_h
    area_h = h - area_top - margin
    stack_top = area_top + (area_h - stack_h) / 2
    title_baseline = stack_top + title_cap
    tag_baseline = title_baseline + gap_title_tag + tag_cap
    bar_y = tag_baseline + tag_desc + 18

    glyph_x = w - margin - glyph_size
    glyph_y = (h - glyph_size) / 2

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">',
        rect_el(0, 0, w, h, c["field"]),
        placed_horizontal_lockup(lockup_x, lockup_y, dark_field=dark),
        text_path(repo["name"], text_x, title_baseline, title_size, 600, c["title"], -0.02)[0],
        text_path(repo["tagline"], text_x, tag_baseline, tag_size, 400, c["tag"], 0)[0],
        five_bar_block(text_x, bar_y, dark)[0],
        glyph_elements(repo["id"], glyph_x, glyph_y, glyph_size, c["ink"]),
        "</svg>\n",
    ]
    return "".join(parts)


def inspect_svg(text: str, label: str) -> None:
    hits = []
    lower = text.lower()
    for needle, name in [
        ("<script", "script"),
        ("javascript:", "javascript"),
        ("data:", "data-uri"),
        ("xlink", "xlink"),
        ("<!doctype", "doctype"),
        ("<!entity", "entity"),
        ("onerror", "handler"),
        ("onload", "handler"),
    ]:
        if needle in lower:
            hits.append(name)
    if re.search(r"""(?:href|src)\s*=\s*['"](?!#)""", text, re.I):
        hits.append("external-ref")
    if re.search(r"url\s*\(\s*[^)#]", text, re.I):
        hits.append("external-url")
    if "font-family" in lower:
        hits.append("live-font")
    if hits:
        raise SystemExit(f"{label}: SVG hygiene failed: {hits}")


def write_svg(path: Path, text: str) -> None:
    inspect_svg(text, path.name)
    path.write_text(text, encoding="utf-8")


def chrome_png(svg_path: Path, png_path: Path, width: int, height: int, scale: int) -> None:
    if not CHROME:
        raise SystemExit("google-chrome is not installed")
    # Render in a throwaway directory so Chrome's default name is predictable.
    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        out = td_path / "shot.png"
        cmd = [
            CHROME,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--no-sandbox",
            "--no-first-run",
            "--disable-extensions",
            "--disable-background-networking",
            "--disable-component-update",
            "--no-default-browser-check",
            f"--force-device-scale-factor={scale}",
            f"--window-size={width},{height}",
            f"--screenshot={out}",
            svg_path.resolve().as_uri(),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        im = Image.open(out)
        # Chrome sometimes adds a pixel of chrome; crop or resize to exact size.
        target = (width * scale, height * scale)
        if im.size != target:
            # If we got a close crop, resize; otherwise centre-crop then resize.
            im = im.convert("RGB")
            if im.size[0] >= target[0] and im.size[1] >= target[1]:
                left = (im.size[0] - target[0]) // 2
                top = (im.size[1] - target[1]) // 2
                im = im.crop((left, top, left + target[0], top + target[1]))
            else:
                im = im.resize(target, Image.Resampling.LANCZOS)
        else:
            im = im.convert("RGB")
        # Strip every text chunk.
        im.save(png_path, "PNG", optimize=True)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def font_raster(size: int, weight: int) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(GEIST_VAR), size=size)
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f


def contact_sheet(banner_pngs: list[tuple[str, Path, Path]], dest: Path) -> None:
    # Two columns, four rows of light, then the same for dark. Half-scale (640x160).
    cell_w, cell_h = 640, 160
    cols, rows = 2, 4
    pad = 48
    header = 140
    section = 48
    width = pad * 2 + cols * cell_w
    light_block = rows * cell_h
    dark_block = rows * cell_h
    height = header + section + light_block + section + dark_block + 48
    img = Image.new("RGB", (width, height), FIELD_DARK)
    draw = ImageDraw.Draw(img)
    title_f = font_raster(36, 600)
    sub_f = font_raster(18, 400)
    label_f = font_raster(16, 500)
    draw.text((pad, 40), "Family repository banners", font=title_f, fill=INK_ON_DARK)
    draw.text((pad, 88), "Revised  ·  24 November 2026  ·  1280 × 320 at half scale", font=sub_f, fill=TAG_ON_DARK)
    # five-bar top right
    bx = width - pad - (5 * 28 + 4 * 3)
    for i, color in enumerate(FIVE_BAR):
        x = bx + i * 31
        draw.rounded_rectangle((x, 52, x + 28, 57), radius=2, fill=color)

    def paste_grid(items: list[tuple[str, Path]], top: int, caption: str) -> None:
        draw.text((pad, top - 32), caption, font=label_f, fill=TAG_ON_DARK)
        for i, (name, path) in enumerate(items):
            c, r = i % cols, i // cols
            x = pad + c * cell_w
            y = top + r * cell_h
            tile = Image.open(path).convert("RGB").resize((cell_w, cell_h), Image.Resampling.LANCZOS)
            img.paste(tile, (x, y))

    light_items = [(name, light) for name, light, _ in banner_pngs]
    dark_items = [(name, dark) for name, _, dark in banner_pngs]
    paste_grid(light_items, header + section, "Light field")
    paste_grid(dark_items, header + section + light_block + section, "Dark field")
    img.save(dest, "PNG", optimize=True)


def closeup_sheet(a: Path, b: Path, dest: Path) -> None:
    w, h = BANNER_W, BANNER_H * 2
    img = Image.new("RGB", (w, h), FIELD_DARK)
    img.paste(Image.open(a).convert("RGB"), (0, 0))
    img.paste(Image.open(b).convert("RGB"), (0, BANNER_H))
    img.save(dest, "PNG", optimize=True)


def main() -> None:
    global GEIST_VAR, FACES
    parser = argparse.ArgumentParser(description="Build the family repository banners.")
    parser.add_argument(
        "--geist",
        required=True,
        type=Path,
        help="Path to Geist-VariableFont_wght.ttf (Geist 1.800 reproduces the committed digests).",
    )
    GEIST_VAR = parser.parse_args().geist
    if not GEIST_VAR.exists():
        raise SystemExit(
            "Geist font not found. Pass --geist with the path to Geist-VariableFont_wght.ttf."
        )
    required = (
        "brand_mark_header_v008.svg",
        "brand_mark_mono-dark_v008.svg",
        "brand_lockup_horizontal-dark_v004.svg",
        "brand_lockup_horizontal-light_v005.svg",
    )
    missing = [name for name in required if not (VIDESIGN_BRAND / name).exists()]
    if missing:
        raise SystemExit(
            "brand masters were not found in the parent of this folder: "
            + ", ".join(missing)
        )
    FACES = Typefaces()

    banner_pngs: list[tuple[str, Path, Path]] = []
    for repo in REPOS:
        light = banner_svg(repo, dark=False)
        dark = banner_svg(repo, dark=True)
        social_d = social_svg(repo, dark=True)
        social_l = social_svg(repo, dark=False)

        light_svg = ROOT / f"{repo['id']}-banner.svg"
        dark_svg = ROOT / f"{repo['id']}-banner-dark.svg"
        social_svg_p = ROOT / f"{repo['id']}-social.svg"
        social_light_svg = ROOT / f"{repo['id']}-social-light.svg"
        write_svg(light_svg, light)
        write_svg(dark_svg, dark)
        write_svg(social_svg_p, social_d)
        write_svg(social_light_svg, social_l)

        light_png = ROOT / f"{repo['id']}-banner.png"
        light_2x = ROOT / f"{repo['id']}-banner@2x.png"
        dark_png = ROOT / f"{repo['id']}-banner-dark.png"
        dark_2x = ROOT / f"{repo['id']}-banner-dark@2x.png"
        social_png = ROOT / f"{repo['id']}-social.png"
        social_light_png = ROOT / f"{repo['id']}-social-light.png"

        chrome_png(light_svg, light_png, BANNER_W, BANNER_H, 1)
        chrome_png(light_svg, light_2x, BANNER_W, BANNER_H, 2)
        chrome_png(dark_svg, dark_png, BANNER_W, BANNER_H, 1)
        chrome_png(dark_svg, dark_2x, BANNER_W, BANNER_H, 2)
        chrome_png(social_svg_p, social_png, SOCIAL_W, SOCIAL_H, 1)
        chrome_png(social_light_svg, social_light_png, SOCIAL_W, SOCIAL_H, 1)

        banner_pngs.append((repo["id"], light_png, dark_png))
        print(f"{repo['id']}: banner {sha256(light_svg)[:16]}…  social {social_png.stat().st_size}B")

    sheet = ROOT / "contact-sheet.png"
    closeup = ROOT / "contact-sheet-closeup.png"
    contact_sheet(banner_pngs, sheet)
    # Two light banners at full size, stacked: seed and bloom.
    closeup_sheet(ROOT / "seed-banner.png", ROOT / "bloom-banner.png", closeup)
    print(f"contact sheet {sha256(sheet)}")
    print(f"closeup {sha256(closeup)}")


if __name__ == "__main__":
    main()
