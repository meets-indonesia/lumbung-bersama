from __future__ import annotations

from pathlib import Path
from typing import Callable, Iterable

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "hackathon_pitch_data_pack_2026-07-10" / "docs" / "visual" / "generated" / "clean_dynamic"
POSTERS = OUT / "posters"
VIDEOS = OUT / "mp4"

W, H = 1920, 1080
FPS = 24
DURATION = 5
FRAMES = FPS * DURATION

FONT_REGULAR = Path("C:/Windows/Fonts/segoeui.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/segoeuib.ttf")

COLORS = {
    "paper": (248, 244, 234),
    "paper_alt": (252, 249, 241),
    "white": (255, 255, 255),
    "ink": (26, 31, 35),
    "muted": (93, 99, 92),
    "line": (218, 210, 194),
    "red": (181, 38, 45),
    "green": (50, 126, 76),
    "gold": (201, 143, 50),
    "brown": (121, 80, 48),
    "blue": (47, 94, 139),
    "soft_red": (255, 241, 241),
    "soft_green": (241, 249, 244),
    "soft_gold": (255, 248, 234),
    "soft_blue": (239, 247, 255),
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REGULAR), size=size)


def ease(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def staged(t: float, start: float, end: float) -> float:
    return ease((t - start) / max(0.001, end - start))


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def text_size(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def wrap_text(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = (current + " " + word).strip()
        if not current or text_size(draw, candidate, fnt)[0] <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    size: int,
    fill=COLORS["ink"],
    bold: bool = False,
    max_width: int | None = None,
    line_gap: int = 8,
) -> int:
    fnt = font(size, bold)
    x, y = xy
    if max_width is None:
        draw.text((x, y), text, fill=fill, font=fnt)
        return text_size(draw, text, fnt)[1]
    total = 0
    for line in wrap_text(draw, text, fnt, max_width):
        draw.text((x, y + total), line, fill=fill, font=fnt)
        total += text_size(draw, line, fnt)[1] + line_gap
    return max(0, total - line_gap)


def fit_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, max_width: int, size: int, fill, bold=True, min_size=24) -> int:
    s = size
    fnt = font(s, bold)
    while text_size(draw, text, fnt)[0] > max_width and s > min_size:
        s -= 2
        fnt = font(s, bold)
    draw.text(xy, text, fill=fill, font=fnt)
    return s


def alpha_color(color: tuple[int, int, int], alpha: float) -> tuple[int, int, int, int]:
    return color[0], color[1], color[2], int(255 * max(0.0, min(1.0, alpha)))


def base_canvas() -> Image.Image:
    img = Image.new("RGBA", (W, H), COLORS["paper"] + (255,))
    d = ImageDraw.Draw(img, "RGBA")
    # Deterministic quiet grid: no image background, only light structure.
    for x in range(0, W, 96):
        d.line((x, 0, x, H), fill=(218, 210, 194, 34), width=1)
    for y in range(0, H, 96):
        d.line((0, y, W, y), fill=(218, 210, 194, 30), width=1)
    for x in range(80, W, 220):
        d.ellipse((x, 920, x + 4, 924), fill=(181, 38, 45, 45))
    d.line((92, 1004, 1828, 1004), fill=(218, 210, 194, 120), width=2)
    return img


def card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill=COLORS["white"], outline=COLORS["line"], radius=22, alpha=1.0):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle((x1 + 8, y1 + 10, x2 + 8, y2 + 10), radius=radius, fill=(0, 0, 0, int(24 * alpha)))
    draw.rounded_rectangle(box, radius=radius, fill=alpha_color(fill, alpha), outline=alpha_color(outline, alpha), width=2)


def chip(draw: ImageDraw.ImageDraw, xy: tuple[int, int], label: str, color=COLORS["green"], fill=COLORS["soft_green"], alpha=1.0, size=24):
    x, y = xy
    fnt = font(size, True)
    tw, th = text_size(draw, label, fnt)
    draw.rounded_rectangle((x, y, x + tw + 34, y + th + 20), radius=17, fill=alpha_color(fill, alpha), outline=alpha_color(color, alpha), width=2)
    draw.text((x + 17, y + 9), label, font=fnt, fill=alpha_color(color, alpha))


def title(draw: ImageDraw.ImageDraw, no: str, heading: str, subtitle: str = ""):
    draw_text(draw, (92, 66), no.upper(), 26, COLORS["red"], True)
    draw_text(draw, (92, 110), heading, 54, COLORS["ink"], True, 920, line_gap=3)
    if subtitle:
        draw_text(draw, (94, 244), subtitle, 27, COLORS["muted"], False, 1000)


def metric(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], value: str, label: str, accent, progress=1.0):
    p = max(0.0, min(1.0, progress))
    x1, y1, x2, y2 = box
    yy = int(lerp(y1 + 34, y1, p))
    card(draw, (x1, yy, x2, yy + (y2 - y1)), alpha=p)
    draw.rectangle((x1, yy, x1 + 10, yy + (y2 - y1)), fill=alpha_color(accent, p))
    fit_text(draw, (x1 + 34, yy + 26), value, x2 - x1 - 70, 50, alpha_color(accent, p), True)
    draw_text(draw, (x1 + 36, yy + 92), label, 25, alpha_color(COLORS["ink"], p), True, x2 - x1 - 72, 3)


def arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], color=COLORS["green"], progress=1.0, width=5):
    p = max(0.0, min(1.0, progress))
    sx, sy = start
    ex, ey = end
    cx, cy = int(lerp(sx, ex, p)), int(lerp(sy, ey, p))
    draw.line((sx, sy, cx, cy), fill=alpha_color(color, p), width=width)
    if p > 0.97:
        draw.polygon([(ex, ey), (ex - 18, ey - 11), (ex - 18, ey + 11)], fill=color)


def progress_bar(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], pct: float, color, progress=1.0, label: str | None = None):
    x1, y1, x2, y2 = box
    if label:
        draw_text(draw, (x1, y1 - 40), label, 25, COLORS["ink"], True)
    draw.rounded_rectangle(box, radius=16, fill=(235, 228, 214, 255))
    draw.rounded_rectangle((x1, y1, int(x1 + (x2 - x1) * pct * progress), y2), radius=16, fill=color)


def draw_pipeline_node(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], label: str, color, progress=1.0):
    p = progress
    x1, y1, x2, y2 = box
    off = int((1 - p) * 30)
    card(draw, (x1, y1 + off, x2, y2 + off), alpha=p)
    draw.ellipse((x1 + 22, y1 + off + 26, x1 + 58, y1 + off + 62), fill=alpha_color(color, p))
    draw_text(draw, (x1 + 78, y1 + off + 26), label, 28, alpha_color(COLORS["ink"], p), True, x2 - x1 - 105)


def render_slide_01(t: float) -> Image.Image:
    img = base_canvas()
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 01", "Lumbung Bersama", "Operating layer koperasi untuk aksi ekonomi terverifikasi.")
    chip(d, (94, 310), "Tema 2 - Optimalisasi Potensi Desa", COLORS["red"], COLORS["soft_red"], staged(t, 0.05, 0.25), 24)
    # Clean granary symbol.
    p = staged(t, 0.05, 0.35)
    d.line((1220, 260, 1570, 260), fill=alpha_color(COLORS["brown"], p), width=10)
    d.polygon([(1190, 258), (1395, 138), (1600, 258)], fill=alpha_color(COLORS["red"], p))
    d.rectangle((1265, 260, 1525, 540), fill=alpha_color((255, 252, 245), p), outline=alpha_color(COLORS["brown"], p), width=5)
    for x in [1320, 1395, 1470]:
        d.ellipse((x - 24, 330, x + 24, 378), fill=alpha_color(COLORS["gold"], p))
    steps = ["Peta", "Score", "Buyer", "Readiness", "Laporan"]
    xs = [170, 500, 830, 1160, 1490]
    for i, label in enumerate(steps):
        pp = staged(t, 0.18 + i * 0.08, 0.42 + i * 0.08)
        draw_pipeline_node(d, (xs[i], 740, xs[i] + 215, 835), label, [COLORS["green"], COLORS["gold"], COLORS["blue"], COLORS["red"], COLORS["brown"]][i], pp)
        if i < len(steps) - 1:
            arrow(d, (xs[i] + 215, 787), (xs[i + 1] - 22, 787), COLORS["green"], staged(t, 0.45 + i * 0.07, 0.62 + i * 0.07), 5)
    draw_text(d, (96, 950), "MVP: Koperasi Opportunity & Offtaker Radar", 30, COLORS["brown"], True)
    return img


def render_slide_02(t: float) -> Image.Image:
    img = base_canvas()
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 02", "Problem: data ada, aksi terputus.", "Koperasi butuh laporan aksi, bukan dashboard pasif.")
    labels = [("Desa", COLORS["red"]), ("Komoditas", COLORS["gold"]), ("Koperasi", COLORS["green"]), ("Stok", COLORS["brown"]), ("Buyer", COLORS["blue"]), ("Pembiayaan", COLORS["ink"])]
    xs = [120, 405, 690, 975, 1260, 1545]
    for i, (label, color) in enumerate(labels):
        pp = staged(t, 0.05 + i * 0.06, 0.25 + i * 0.06)
        draw_pipeline_node(d, (xs[i], 440, xs[i] + 220, 535), label, color, pp)
        if i < len(labels) - 1:
            arrow(d, (xs[i] + 220, 488), (xs[i + 1] - 20, 488), COLORS["muted"], staged(t, 0.38 + i * 0.06, 0.52 + i * 0.06), 4)
    p = staged(t, 0.68, 0.88)
    card(d, (420, 720, 1500, 855), fill=COLORS["soft_green"], outline=COLORS["green"], alpha=p)
    draw_text(d, (462, 748), "Output final: laporan aksi koperasi", 40, alpha_color(COLORS["green"], p), True)
    draw_text(d, (464, 808), "source + confidence + caveat + next action", 28, alpha_color(COLORS["muted"], p), False)
    return img


def render_slide_03(t: float) -> Image.Image:
    img = base_canvas()
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 03", "Snapshot publik: gap aktivasi.", "Konteks publik, bukan klaim statistik final nasional.")
    cards = [
        ("83.382", "koperasi", COLORS["green"]),
        ("1.140", "terparse bisnis", COLORS["gold"]),
        ("53.339", "transaksi", COLORS["blue"]),
        ("Rp56,6 miliar", "nilai transaksi", COLORS["red"]),
    ]
    for i, (value, label, color) in enumerate(cards):
        metric(d, (100 + i * 455, 365, 480 + i * 455, 535), value, label, color, staged(t, 0.05 + i * 0.06, 0.28 + i * 0.06))
    p = staged(t, 0.45, 0.85)
    card(d, (170, 660, 900, 890), alpha=1)
    progress_bar(d, (230, 770, 830, 820), 0.6249, COLORS["red"], p, "EWS belum lapor: 62,49%")
    progress_bar(d, (230, 855, 830, 905), 0.3751, COLORS["green"], p, "EWS sudah lapor: 37,51%")
    card(d, (1020, 660, 1750, 890), alpha=1)
    for i, (label, pct, color) in enumerate([("NIB", 0.729, COLORS["green"]), ("NPWP", 0.971, COLORS["blue"]), ("RAT 2025", 0.603, COLORS["gold"])]):
        y = 725 + i * 68
        draw_text(d, (1070, y), label, 26, COLORS["ink"], True)
        progress_bar(d, (1220, y + 10, 1640, y + 44), pct, color, p)
        draw_text(d, (1660, y), f"{pct*100:.1f}%".replace(".", ","), 24, color, True)
    return img


def render_slide_04(t: float) -> Image.Image:
    img = base_canvas()
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 04", "Shared DB: data kaya, belum jadi keputusan.", "Aggregate-only sample hackathon; bukan skema final SIMKOPDES.")
    top = [("547.869", "rows", COLORS["ink"]), ("27", "tabel", COLORS["brown"]), ("1.026", "profil sample", COLORS["green"]), ("Rp105,39 miliar", "request pembiayaan", COLORS["red"])]
    for i, item in enumerate(top):
        metric(d, (100 + i * 455, 345, 480 + i * 455, 505), *item, progress=staged(t, 0.04 + i * 0.05, 0.26 + i * 0.05))
    bars = [
        ("8.191 komoditas", 1280, COLORS["red"]),
        ("13.974 produk/stok", 1080, COLORS["green"]),
        ("3.254 kemitraan", 860, COLORS["gold"]),
        ("1.000 paid trx", 660, COLORS["blue"]),
        ("1 pembiayaan verified", 460, COLORS["ink"]),
    ]
    for i, (label, width, color) in enumerate(bars):
        p = staged(t, 0.38 + i * 0.08, 0.62 + i * 0.08)
        x = 320 + i * 90
        y = 625 + i * 70
        d.rounded_rectangle((x, y, x + int(width * p), y + 54), radius=18, fill=alpha_color(color, 0.96))
        if p > 0.25:
            draw_text(d, (x + 28, y + 10), label, 27, COLORS["white"], True)
    chip(d, (100, 960), "bottleneck: verification + financing readiness", COLORS["red"], COLORS["soft_red"], staged(t, 0.78, 0.96))
    return img


def render_slide_05(t: float) -> Image.Image:
    img = base_canvas()
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 05", "Komoditas butuh strategi nilai tambah.", "Potensi besar harus menjadi offer siap buyer.")
    card(d, (100, 350, 900, 900))
    draw_text(d, (140, 390), "Top komoditas sample", 34, COLORS["ink"], True)
    data = [("Padi", 403, "Rp3,86T", COLORS["green"]), ("Jagung", 394, "Rp1,33T", COLORS["gold"]), ("Sapi", 364, "Rp366,95M", COLORS["brown"]), ("Perikanan", 315, "Rp150,08M", COLORS["blue"]), ("Cabai", 298, "Rp91,66M", COLORS["red"])]
    for i, (name, value, money, color) in enumerate(data):
        y = 475 + i * 78
        p = staged(t, 0.15 + i * 0.06, 0.42 + i * 0.06)
        draw_text(d, (145, y), name, 27, COLORS["ink"], True)
        progress_bar(d, (315, y + 9, 760, y + 43), value / 420, color, p)
        draw_text(d, (782, y), f"{value} area", 23, color, True)
        draw_text(d, (782, y + 34), money, 20, COLORS["muted"], False)
    card(d, (1010, 350, 1810, 900))
    draw_text(d, (1050, 390), "Value-add ladder", 34, COLORS["ink"], True)
    steps = [("grading", COLORS["brown"]), ("packaging", COLORS["gold"]), ("processing", COLORS["green"]), ("bundling volume", COLORS["blue"]), ("buyer-ready offer", COLORS["red"])]
    for i, (label, color) in enumerate(steps):
        p = staged(t, 0.42 + i * 0.07, 0.62 + i * 0.07)
        x = 1090 + i * 90
        y = 770 - i * 78
        card(d, (x, y, x + 520, y + 58), fill=COLORS["paper_alt"], outline=color, alpha=p)
        draw_text(d, (x + 26, y + 14), label, 25, alpha_color(color, p), True)
    return img


def render_slide_06(t: float) -> Image.Image:
    img = base_canvas()
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 06", "Solusi: action pipeline koperasi.", "Peta bukan akhir. Output akhirnya laporan aksi.")
    steps = [
        ("1", "Peta", "potensi desa", COLORS["green"]),
        ("2", "Score", "prioritas", COLORS["gold"]),
        ("3", "Buyer", "matching lite", COLORS["blue"]),
        ("4", "Stock", "readiness", COLORS["brown"]),
        ("5", "Finance", "readiness", COLORS["red"]),
        ("6", "Laporan", "aksi", COLORS["ink"]),
    ]
    for i, (num, head, sub, color) in enumerate(steps):
        x = 95 + i * 300
        y = 520 if i % 2 == 0 else 665
        p = staged(t, 0.05 + i * 0.07, 0.30 + i * 0.07)
        card(d, (x, y, x + 245, y + 155), alpha=p)
        draw_text(d, (x + 24, y + 20), num, 34, alpha_color(COLORS["red"], p), True)
        draw_text(d, (x + 70, y + 28), head, 31, alpha_color(COLORS["ink"], p), True)
        draw_text(d, (x + 70, y + 78), sub, 23, alpha_color(COLORS["muted"], p), False)
        if i < len(steps) - 1:
            arrow(d, (x + 245, y + 78), (x + 295, (665 if i % 2 == 0 else 520) + 78), color, staged(t, 0.38 + i * 0.07, 0.55 + i * 0.07), 5)
    chip(d, (100, 940), "human approval sebelum outreach/report", COLORS["green"], COLORS["soft_green"], staged(t, 0.78, 0.94))
    return img


def render_slide_07(t: float) -> Image.Image:
    img = base_canvas()
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 07", "Coverage: challenge -> fitur -> output.", "MVP menguji satu alur keputusan sampai tuntas.")
    cols = [(90, 470, "Challenge"), (520, 1180, "MVP feature"), (1230, 1830, "Output")]
    for x1, x2, head in cols:
        d.rounded_rectangle((x1, 330, x2, 390), radius=16, fill=COLORS["ink"])
        draw_text(d, (x1 + 22, 344), head, 24, COLORS["white"], True)
    rows = [
        ("Potensi belum optimal", "Peta + Score", "Prioritas desa"),
        ("Cocokkan pasar", "Market signal", "Buyer archetype"),
        ("Temukan offtaker", "Approved outreach", "Shortlist"),
        ("Nilai tambah", "Product tagging", "Value-add plan"),
        ("Jaga trust", "Readiness guardrail", "Confidence"),
        ("Tutup keputusan", "Laporan Aksi", "Action plan"),
    ]
    for i, row in enumerate(rows):
        p = staged(t, 0.08 + i * 0.07, 0.30 + i * 0.07)
        y = 420 + i * 84
        for (x1, x2, _), txt in zip(cols, row):
            card(d, (x1, y, x2, y + 62), fill=COLORS["white"], alpha=p, radius=16)
            draw_text(d, (x1 + 20, y + 16), txt, 23, alpha_color(COLORS["ink"], p), True, x2 - x1 - 40)
    return img


def render_slide_08(t: float) -> Image.Image:
    img = base_canvas()
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 08", "AI: explainable, bukan otomatis.", "Rekomendasi punya source, confidence, caveat, approval.")
    parts = [("30%", "komoditas", COLORS["green"]), ("20%", "koperasi", COLORS["blue"]), ("20%", "stok", COLORS["gold"]), ("15%", "pasar", COLORS["red"]), ("10%", "kemitraan", COLORS["brown"]), ("5%", "data", COLORS["ink"])]
    for i, (pct, label, color) in enumerate(parts):
        x = 160 + (i % 3) * 560
        y = 385 + (i // 3) * 185
        metric(d, (x, y, x + 450, y + 135), pct, label, color, staged(t, 0.06 + i * 0.06, 0.28 + i * 0.06))
    guards = ["source", "confidence", "caveat", "outlier", "human approval"]
    for i, guard in enumerate(guards):
        chip(d, (220 + i * 300, 830), guard, COLORS["green"], COLORS["soft_green"], staged(t, 0.60 + i * 0.05, 0.78 + i * 0.05), 23)
    return img


def render_slide_09(t: float) -> Image.Image:
    img = base_canvas()
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 09", "Architecture: hemat, aman, cloud-ready.", "No PII demo. Credential di secret manager.")
    nodes = [("User", COLORS["ink"]), ("Next.js", COLORS["green"]), ("API", COLORS["blue"]), ("Aggregate", COLORS["gold"]), ("Postgres SSL", COLORS["red"]), ("Laporan", COLORS["brown"])]
    xs = [100, 415, 730, 1045, 1360, 1620]
    for i, (label, color) in enumerate(nodes):
        p = staged(t, 0.05 + i * 0.06, 0.25 + i * 0.06)
        card(d, (xs[i], 460, xs[i] + 230, 575), alpha=p)
        draw_text(d, (xs[i] + 32, 500), label, 27, alpha_color(color, p), True, 180)
        if i < len(nodes) - 1:
            arrow(d, (xs[i] + 230, 518), (xs[i + 1] - 18, 518), COLORS["ink"], staged(t, 0.38 + i * 0.06, 0.52 + i * 0.06), 4)
    guards = ["HttpOnly", "role-gated", "CSRF guard", "Cloud Logging", "Budget Alert", "no PII"]
    for i, guard in enumerate(guards):
        chip(d, (170 + (i % 3) * 520, 720 + (i // 3) * 90), guard, [COLORS["green"], COLORS["blue"], COLORS["red"]][i % 3], COLORS["white"], staged(t, 0.62 + i * 0.04, 0.78 + i * 0.04), 24)
    return img


def render_slide_10(t: float) -> Image.Image:
    img = base_canvas()
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 10", "Impact: pipeline yang bergerak.", "Dampak diukur dari peluang yang berubah menjadi aksi.")
    steps = ["Data ready", "Opportunity", "Approved", "Outreach", "Stock ready", "Action report"]
    for i, step in enumerate(steps):
        p = staged(t, 0.05 + i * 0.07, 0.30 + i * 0.07)
        x = 120 + i * 295
        y = 790 - i * 70
        card(d, (x, y, x + 245, y + 92), alpha=p)
        draw_text(d, (x + 24, y + 28), step, 24, alpha_color(COLORS["ink"], p), True, 200)
        if i < len(steps) - 1:
            arrow(d, (x + 245, y + 46), (x + 290, y - 24), COLORS["green"], staged(t, 0.40 + i * 0.06, 0.55 + i * 0.06), 5)
    lanes = [("Managed platform", COLORS["green"]), ("Implementation", COLORS["gold"]), ("Buyer workflow", COLORS["blue"]), ("Reporting", COLORS["red"])]
    for i, (lane, color) in enumerate(lanes):
        chip(d, (170 + i * 420, 940), lane, color, COLORS["white"], staged(t, 0.70 + i * 0.04, 0.86 + i * 0.04), 23)
    return img


def render_slide_11(t: float) -> Image.Image:
    img = base_canvas()
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 11", "Team roles.", "Ganti placeholder dengan nama anggota final.")
    roles = [
        ("Product", "story + Q&A", COLORS["red"]),
        ("Tech", "API + deploy", COLORS["green"]),
        ("Data/AI", "score + guardrail", COLORS["gold"]),
        ("Design", "UX + visual", COLORS["blue"]),
        ("Demo/Ops", "QA + submit", COLORS["brown"]),
    ]
    for i, (role, desc, color) in enumerate(roles):
        x = 150 + (i % 3) * 560
        y = 390 + (i // 3) * 230
        p = staged(t, 0.08 + i * 0.07, 0.30 + i * 0.07)
        card(d, (x, y, x + 455, y + 160), alpha=p)
        d.rounded_rectangle((x + 28, y + 32, x + 86, y + 90), radius=18, fill=alpha_color(color, p))
        draw_text(d, (x + 112, y + 32), role, 30, alpha_color(COLORS["ink"], p), True)
        draw_text(d, (x + 112, y + 82), desc, 23, alpha_color(COLORS["muted"], p), False)
        draw_text(d, (x + 30, y + 118), "Nama: ________", 22, alpha_color(COLORS["brown"], p), False)
    return img


def render_slide_12(t: float) -> Image.Image:
    img = base_canvas()
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 12", "Submission ready.", "Repo, PDF, demo URL, dan akun juri harus siap.")
    items = [("Repo publik", "README + source"), ("Pitch PDF", "10-12 slide"), ("Demo URL", "test account"), ("Video demo", "<= 3 menit")]
    for i, (head, sub) in enumerate(items):
        x = 150 + (i % 2) * 820
        y = 390 + (i // 2) * 180
        p = staged(t, 0.06 + i * 0.08, 0.30 + i * 0.08)
        card(d, (x, y, x + 700, y + 125), alpha=p)
        d.rounded_rectangle((x + 32, y + 38, x + 76, y + 82), radius=13, fill=alpha_color(COLORS["green"], p))
        draw_text(d, (x + 100, y + 28), head, 31, alpha_color(COLORS["ink"], p), True)
        draw_text(d, (x + 102, y + 76), sub, 23, alpha_color(COLORS["muted"], p), False)
    flow = ["login", "peta", "score", "buyer", "ready", "laporan"]
    for i, step in enumerate(flow):
        x = 210 + i * 260
        y = 830
        p = staged(t, 0.55 + i * 0.05, 0.72 + i * 0.05)
        card(d, (x, y, x + 160, y + 64), fill=COLORS["paper_alt"], alpha=p, radius=18)
        draw_text(d, (x + 31, y + 18), step, 23, alpha_color(COLORS["ink"], p), True)
        if i < len(flow) - 1:
            arrow(d, (x + 160, y + 32), (x + 238, y + 32), COLORS["green"], staged(t, 0.66 + i * 0.05, 0.82 + i * 0.05), 4)
    chip(d, (150, 960), "no secrets - no PII - test account only", COLORS["red"], COLORS["soft_red"], staged(t, 0.78, 0.94))
    return img


SLIDES: list[tuple[str, Callable[[float], Image.Image]]] = [
    ("slide-01-opening-hero", render_slide_01),
    ("slide-02-problem-pipeline", render_slide_02),
    ("slide-03-public-activation-gap", render_slide_03),
    ("slide-04-shared-db-funnel", render_slide_04),
    ("slide-05-commodity-value-add", render_slide_05),
    ("slide-06-mvp-flow", render_slide_06),
    ("slide-07-feature-coverage", render_slide_07),
    ("slide-08-explainable-ai", render_slide_08),
    ("slide-09-cloud-architecture", render_slide_09),
    ("slide-10-business-impact", render_slide_10),
    ("slide-11-team-roles", render_slide_11),
    ("slide-12-submission-ready", render_slide_12),
]


def save_video(name: str, renderer: Callable[[float], Image.Image]):
    path = VIDEOS / f"{name}.mp4"
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), FPS, (W, H))
    if not writer.isOpened():
        raise RuntimeError(f"Could not open video writer for {path}")
    for i in range(FRAMES):
        t = i / (FRAMES - 1)
        frame = renderer(t).convert("RGB")
        arr = cv2.cvtColor(np.array(frame), cv2.COLOR_RGB2BGR)
        writer.write(arr)
    writer.release()


def contact_sheet(paths: Iterable[Path]):
    paths = list(paths)
    thumb_w, thumb_h = 480, 270
    cols = 3
    rows = (len(paths) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 540, rows * 350), COLORS["paper"])
    for idx, path in enumerate(paths):
        im = Image.open(path).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        cell = Image.new("RGB", (540, 350), COLORS["paper_alt"])
        cell.paste(im, (30, 22))
        d = ImageDraw.Draw(cell)
        draw_text(d, (30, 306), path.name, 20, COLORS["ink"], True, 490)
        sheet.paste(cell, ((idx % cols) * 540, (idx // cols) * 350))
    sheet.save(OUT / "clean-dynamic-contact-sheet.png")


def main():
    POSTERS.mkdir(parents=True, exist_ok=True)
    VIDEOS.mkdir(parents=True, exist_ok=True)
    for name, renderer in SLIDES:
        poster = renderer(1.0).convert("RGB")
        poster.save(POSTERS / f"{name}.png")
        save_video(name, renderer)
        print(f"generated {name}")
    contact_sheet(sorted(POSTERS.glob("slide-*.png")))
    print(f"done: {OUT}")


if __name__ == "__main__":
    main()
