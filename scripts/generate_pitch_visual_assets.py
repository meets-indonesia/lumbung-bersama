from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "output" / "hackathon_pitch_data_pack_2026-07-10"
RAW = PACK / "docs" / "visual" / "generated" / "higgsfield_raw"
FINAL = PACK / "docs" / "visual" / "generated" / "final"

W, H = 1920, 1080

COLORS = {
    "paper": (248, 244, 234),
    "paper2": (255, 252, 245),
    "ink": (23, 28, 32),
    "muted": (93, 99, 92),
    "red": (177, 38, 42),
    "green": (53, 120, 77),
    "gold": (196, 138, 52),
    "brown": (119, 79, 49),
    "blue": (48, 94, 135),
    "line": (220, 211, 194),
    "white": (255, 255, 255),
}

FONT_REGULAR = Path("C:/Windows/Fonts/segoeui.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/segoeuib.ttf")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REGULAR), size=size)


def text_size(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def wrap_text(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = (current + " " + word).strip()
        if text_size(draw, candidate, fnt)[0] <= max_width or not current:
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
    color: tuple[int, int, int] = COLORS["ink"],
    bold: bool = False,
    max_width: int | None = None,
    line_gap: int = 10,
) -> int:
    fnt = font(size, bold)
    x, y = xy
    if max_width is None:
        draw.text((x, y), text, font=fnt, fill=color)
        return text_size(draw, text, fnt)[1]
    total = 0
    for line in wrap_text(draw, text, fnt, max_width):
        draw.text((x, y + total), line, font=fnt, fill=color)
        total += text_size(draw, line, fnt)[1] + line_gap
    return max(0, total - line_gap)


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill, outline=None, width=1, radius=26):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def shadowed_card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill=(255, 255, 255), outline=COLORS["line"]):
    x1, y1, x2, y2 = box
    rounded(draw, (x1 + 8, y1 + 10, x2 + 8, y2 + 10), (0, 0, 0, 22), radius=24)
    rounded(draw, box, fill, outline=outline, width=2, radius=24)


def base(raw_name: str | None = None) -> Image.Image:
    if raw_name:
        path = RAW / raw_name
        if path.exists():
            img = Image.open(path).convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
            img = ImageEnhance.Color(img).enhance(0.45)
            img = ImageEnhance.Contrast(img).enhance(0.76)
            img = img.filter(ImageFilter.GaussianBlur(2.1))
            veil = Image.new("RGB", (W, H), COLORS["paper"])
            return Image.blend(img, veil, 0.82)
    return Image.new("RGB", (W, H), COLORS["paper"])


def title(draw: ImageDraw.ImageDraw, slide_no: str, heading: str, subtitle: str | None = None):
    draw_text(draw, (92, 68), slide_no.upper(), 26, COLORS["red"], True)
    draw_text(draw, (92, 108), heading, 58, COLORS["ink"], True, max_width=1120, line_gap=4)
    if subtitle:
        draw_text(draw, (94, 238), subtitle, 27, COLORS["muted"], False, max_width=1080)


def chip(draw: ImageDraw.ImageDraw, xy: tuple[int, int], label: str, color=COLORS["green"], fill=(244, 249, 244)):
    x, y = xy
    fnt = font(24, True)
    tw, th = text_size(draw, label, fnt)
    rounded(draw, (x, y, x + tw + 34, y + th + 22), fill, outline=color, width=2, radius=18)
    draw.text((x + 17, y + 10), label, font=fnt, fill=color)


def metric_card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], value: str, label: str, accent=COLORS["green"], note: str | None = None):
    shadowed_card(draw, box)
    x1, y1, x2, _ = box
    draw.rectangle((x1, y1, x1 + 10, box[3]), fill=accent)
    max_w = x2 - x1 - 68
    value_size = 52
    value_font = font(value_size, True)
    while text_size(draw, value, value_font)[0] > max_w and value_size > 34:
        value_size -= 2
        value_font = font(value_size, True)
    draw.text((x1 + 34, y1 + 24), value, font=value_font, fill=accent)
    value_h = text_size(draw, value, value_font)[1]
    draw_text(draw, (x1 + 36, y1 + 42 + value_h), label, 25, COLORS["ink"], True, max_width=x2 - x1 - 72)
    if note:
        draw_text(draw, (x1 + 36, y1 + 150), note, 21, COLORS["muted"], False, max_width=x2 - x1 - 72)


def line_arrow(draw: ImageDraw.ImageDraw, start: tuple[int, int], end: tuple[int, int], fill=COLORS["ink"], width=5):
    draw.line((start, end), fill=fill, width=width)
    ex, ey = end
    sx, sy = start
    if ex >= sx:
        pts = [(ex, ey), (ex - 18, ey - 12), (ex - 18, ey + 12)]
    else:
        pts = [(ex, ey), (ex + 18, ey - 12), (ex + 18, ey + 12)]
    draw.polygon(pts, fill=fill)


def progress(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], pct: float, color, label: str):
    x1, y1, x2, y2 = box
    rounded(draw, box, (238, 232, 219), radius=18)
    rounded(draw, (x1, y1, int(x1 + (x2 - x1) * pct), y2), color, radius=18)
    draw_text(draw, (x1, y1 - 42), label, 25, COLORS["ink"], True)


def slide_01():
    img = base("slide-01-opening-hero.raw.png")
    d = ImageDraw.Draw(img, "RGBA")
    shadowed_card(d, (80, 72, 880, 390), (255, 252, 245, 235))
    draw_text(d, (124, 112), "Lumbung Bersama", 76, COLORS["ink"], True)
    draw_text(d, (128, 212), "Operating layer koperasi untuk mengubah potensi desa menjadi aksi ekonomi yang terverifikasi.", 30, COLORS["muted"], False, 680)
    chip(d, (128, 318), "Tema 2 - Optimalisasi Potensi Desa", COLORS["red"], (255, 244, 244))
    steps = ["Peta", "Score", "Buyer", "Readiness", "Laporan"]
    x = 220
    for i, step in enumerate(steps):
        box = (x + i * 300, 780, x + i * 300 + 185, 880)
        shadowed_card(d, box, (255, 255, 255, 235))
        draw_text(d, (box[0] + 32, box[1] + 30), step, 28, COLORS["ink"], True)
        if i < len(steps) - 1:
            line_arrow(d, (box[2] + 18, 830), (box[2] + 92, 830), COLORS["green"], 6)
    draw_text(d, (96, 980), "MVP: Koperasi Opportunity & Offtaker Radar", 28, COLORS["brown"], True)
    img.save(FINAL / "slide-01-opening-hero.png")


def slide_02():
    img = base("slide-02-fragmented-data-pipeline.raw.png")
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 02", "Potensi desa ada, jalur eksekusinya terputus.", "Problem utama: data belum tersambung menjadi keputusan usaha koperasi.")
    labels = ["Desa", "Komoditas", "Koperasi", "Produk/Stok", "Buyer", "Pembiayaan"]
    positions = [(110, 430), (430, 360), (770, 455), (1040, 350), (1320, 480), (1500, 330)]
    colors = [COLORS["red"], COLORS["gold"], COLORS["green"], COLORS["brown"], COLORS["blue"], COLORS["ink"]]
    for idx, (lab, pos) in enumerate(zip(labels, positions)):
        x, y = pos
        shadowed_card(d, (x, y, x + 250, y + 120), (255, 255, 255, 235))
        draw_text(d, (x + 30, y + 34), lab, 30, colors[idx], True)
    for i in range(len(positions) - 1):
        line_arrow(d, (positions[i][0] + 250, positions[i][1] + 60), (positions[i + 1][0], positions[i + 1][1] + 60), COLORS["muted"], 4)
    shadowed_card(d, (510, 795, 1415, 940), (255, 252, 245, 245), COLORS["green"])
    draw_text(d, (548, 824), "Output yang dibutuhkan: laporan aksi, bukan dashboard pasif", 38, COLORS["green"], True)
    draw_text(d, (550, 882), "Source label + confidence + caveat + next action + human approval", 27, COLORS["muted"], False)
    img.save(FINAL / "slide-02-fragmented-data-pipeline.png")


def slide_03():
    img = base("slide-03-activation-gap.raw.png")
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 03", "Snapshot publik menunjukkan gap aktivasi dan readiness.", "Dipakai sebagai sinyal konteks publik, bukan klaim integrasi produksi.")
    metric_card(d, (92, 350, 455, 545), "83.382", "koperasi pada statistik publik", COLORS["green"])
    metric_card(d, (500, 350, 863, 545), "1.140", "koperasi muncul di daftar bisnis terparse", COLORS["gold"], "sekitar 1,37% dari total statistik")
    metric_card(d, (908, 350, 1271, 545), "53.339", "transaksi bisnis publik", COLORS["blue"])
    metric_card(d, (1316, 350, 1810, 545), "Rp56,6 miliar", "nilai transaksi publik", COLORS["red"])
    shadowed_card(d, (92, 640, 890, 900), (255, 255, 255, 235))
    progress(d, (150, 770, 830, 825), 0.6249, COLORS["red"], "EWS belum lapor: 62,49%")
    progress(d, (150, 865, 830, 920), 0.3751, COLORS["green"], "EWS sudah lapor: 37,51%")
    shadowed_card(d, (970, 640, 1810, 900), (255, 255, 255, 235))
    draw_text(d, (1020, 682), "Readiness publik", 34, COLORS["ink"], True)
    for i, (label, pct, color) in enumerate([("NIB", 0.729, COLORS["green"]), ("NPWP", 0.971, COLORS["blue"]), ("RAT 2025", 0.603, COLORS["gold"])]):
        y = 760 + i * 70
        draw_text(d, (1025, y), label, 26, COLORS["ink"], True)
        rounded(d, (1180, y + 8, 1640, y + 42), (237, 232, 221), radius=14)
        rounded(d, (1180, y + 8, int(1180 + 460 * pct), y + 42), color, radius=14)
        draw_text(d, (1665, y), f"{pct*100:.1f}%".replace(".", ","), 25, color, True)
    chip(d, (94, 965), "public snapshot - needs caveat", COLORS["brown"], (255, 248, 238))
    img.save(FINAL / "slide-03-simkopdes-activation-gap.png")


def slide_04():
    img = base("slide-04-db-funnel.raw.png")
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 04", "Sample DB kaya, tetapi belum menjadi alur keputusan.", "Aggregate-only dari shared PostgreSQL hackathon; skema sample terbatas, bukan referensi utama SIMKOPDES.")
    metric_card(d, (105, 345, 505, 555), "547.869", "row dari 27 tabel", COLORS["ink"])
    metric_card(d, (555, 345, 955, 555), "1.026", "profil koperasi/desa/wilayah sample", COLORS["green"])
    metric_card(d, (1005, 345, 1405, 555), "Rp11,47 miliar", "1.000 transaksi paid", COLORS["blue"])
    metric_card(d, (1455, 345, 1810, 555), "Rp105,39 miliar", "118 pengajuan pembiayaan", COLORS["red"])
    stages = [
        ("8.191", "baris komoditas desa", COLORS["red"]),
        ("13.974", "produk/inventaris", COLORS["green"]),
        ("3.254", "pengajuan kemitraan", COLORS["gold"]),
        ("1.000", "transaksi paid", COLORS["blue"]),
        ("1", "pembiayaan verified", COLORS["ink"]),
    ]
    x, y, w0 = 310, 645, 1300
    for i, (num, lab, color) in enumerate(stages):
        width = w0 - i * 210
        left = x + i * 105
        top = y + i * 70
        rounded(d, (left, top, left + width, top + 58), color + (238,), radius=18)
        draw_text(d, (left + 32, top + 11), f"{num}  {lab}", 29, COLORS["white"], True)
    chip(d, (106, 965), "bottleneck utama: financing readiness dan verification", COLORS["red"], (255, 244, 244))
    img.save(FINAL / "slide-04-shared-db-funnel.png")


def slide_05():
    img = base("slide-05-commodity-value-add.raw.png")
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 05", "Komoditas prioritas perlu scoring dan strategi nilai tambah.", "Potensi besar harus diubah menjadi offer yang siap buyer.")
    shadowed_card(d, (90, 355, 930, 930), (255, 255, 255, 235))
    draw_text(d, (130, 395), "Top komoditas sample", 34, COLORS["ink"], True)
    data = [("Padi", 403, "Rp3,86T", COLORS["green"]), ("Jagung", 394, "Rp1,33T", COLORS["gold"]), ("Sapi", 364, "Rp366,95M", COLORS["brown"]), ("Perikanan", 315, "Rp150,08M", COLORS["blue"]), ("Cabai", 298, "Rp91,66M", COLORS["red"])]
    maxv = 420
    for i, (name, val, money, color) in enumerate(data):
        y = 475 + i * 78
        draw_text(d, (140, y), name, 27, COLORS["ink"], True)
        rounded(d, (300, y + 10, 780, y + 44), (238, 232, 221), radius=14)
        rounded(d, (300, y + 10, int(300 + 480 * val / maxv), y + 44), color, radius=14)
        draw_text(d, (800, y), f"{val} area", 24, color, True)
        draw_text(d, (800, y + 34), money, 20, COLORS["muted"], False)
    shadowed_card(d, (1030, 355, 1810, 930), (255, 252, 245, 242))
    draw_text(d, (1070, 395), "Value-add ladder", 34, COLORS["ink"], True)
    ladder = ["grading", "packaging", "processing", "bundling volume", "buyer-ready offer"]
    for i, item in enumerate(ladder):
        left = 1120 + i * 95
        top = 780 - i * 78
        rounded(d, (left, top, left + 520, top + 56), (255, 255, 255, 235), outline=COLORS["line"], width=2, radius=18)
        draw_text(d, (left + 28, top + 12), item, 27, [COLORS["brown"], COLORS["gold"], COLORS["green"], COLORS["blue"], COLORS["red"]][i], True)
    chip(d, (1070, 830), "nilai potensi perlu validasi", COLORS["brown"], (255, 248, 238))
    img.save(FINAL / "slide-05-commodity-value-add.png")


def slide_06():
    img = base(None)
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 06", "Lumbung Bersama mengubah data menjadi action pipeline.", "Peta bukan akhir. Output akhirnya adalah laporan aksi koperasi.")
    for i, color in enumerate([COLORS["red"], COLORS["gold"], COLORS["green"], COLORS["blue"]]):
        d.line((120 + i * 80, 360 + i * 40, 1760 - i * 60, 910 - i * 30), fill=color + (28,), width=28)
    steps = [
        ("1", "Peta Potensi Desa", "wilayah + komoditas"),
        ("2", "Opportunity Score", "prioritas + alasan"),
        ("3", "Buyer Matching Lite", "target + fit"),
        ("4", "Stock Readiness", "stok + gap"),
        ("5", "Financing Readiness", "status + next action"),
        ("6", "Laporan Aksi", "rapat pengurus"),
    ]
    for i, (num, head, sub) in enumerate(steps):
        x = 90 + i * 300
        y = 500 if i % 2 == 0 else 650
        shadowed_card(d, (x, y, x + 250, y + 180), (255, 255, 255, 238))
        draw_text(d, (x + 24, y + 18), num, 38, COLORS["red"], True)
        draw_text(d, (x + 24, y + 72), head, 26, COLORS["ink"], True, 200)
        draw_text(d, (x + 24, y + 128), sub, 20, COLORS["muted"], False, 200)
        if i < len(steps) - 1:
            line_arrow(d, (x + 250, y + 90), (x + 295, (650 if i % 2 == 0 else 500) + 90), COLORS["green"], 5)
    chip(d, (92, 940), "human approval sebelum outreach/report final", COLORS["green"], (244, 249, 244))
    img.save(FINAL / "slide-06-mvp-flow.png")


def slide_07():
    img = base(None)
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 07", "Fitur MVP menjawab challenge Tema 2 secara langsung.", "Gunakan matrix ini untuk menjaga pitch tetap relevan ke problem statement.")
    headers = ["Challenge", "MVP feature", "Output"]
    col_x = [90, 710, 1320]
    widths = [560, 540, 510]
    y = 340
    for x, w, h in zip(col_x, widths, headers):
        rounded(d, (x, y, x + w, y + 62), COLORS["ink"], radius=18)
        draw_text(d, (x + 24, y + 14), h, 26, COLORS["white"], True)
    rows = [
        ("Potensi belum optimal", "Peta Potensi + Opportunity Score", "Komoditas/desa prioritas"),
        ("Cocokkan potensi dengan pasar", "Market signal + Buyer Matching", "Buyer archetype"),
        ("Temukan offtaker tepat", "Approved outreach workflow", "Shortlist + alasan match"),
        ("Tingkatkan nilai tambah", "Product tagging + value-add recommendation", "Grading, packaging, bundling"),
        ("Jaga trust", "Readiness score + guardrail", "Confidence, caveat, status"),
        ("Tutup keputusan", "Laporan Aksi", "Action plan pengurus"),
    ]
    for i, row in enumerate(rows):
        top = 420 + i * 94
        fill = (255, 255, 255, 238) if i % 2 == 0 else (251, 247, 237, 238)
        for x, w, txt in zip(col_x, widths, row):
            rounded(d, (x, top, x + w, top + 74), fill, outline=COLORS["line"], width=2, radius=16)
            draw_text(d, (x + 22, top + 16), txt, 23, COLORS["ink"], True if x != col_x[0] else False, w - 44)
    chip(d, (90, 990), "MVP menguji satu alur keputusan sampai tuntas", COLORS["red"], (255, 244, 244))
    img.save(FINAL / "slide-07-feature-coverage-matrix.png")


def slide_08():
    img = base("slide-08-explainable-ai.raw.png")
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 08", "AI membantu prioritas, bukan mengambil keputusan otomatis.", "Opportunity Score selalu punya source, confidence, caveat, dan human approval.")
    parts = [
        ("30%", "potensi komoditas", COLORS["green"]),
        ("20%", "kesiapan koperasi", COLORS["blue"]),
        ("20%", "produk/stok", COLORS["gold"]),
        ("15%", "sinyal pasar", COLORS["red"]),
        ("10%", "sinyal kemitraan", COLORS["brown"]),
        ("5%", "kelengkapan data", COLORS["ink"]),
    ]
    x, y = 120, 390
    for i, (pct, label, color) in enumerate(parts):
        box = (x + (i % 3) * 570, y + (i // 3) * 190, x + (i % 3) * 570 + 500, y + (i // 3) * 190 + 135)
        metric_card(d, box, pct, label, color)
    shadowed_card(d, (245, 825, 1675, 955), (255, 252, 245, 242), COLORS["green"])
    checks = ["source-labeled evidence", "confidence", "caveat", "outlier flag", "human approval"]
    cx = 290
    for item in checks:
        chip(d, (cx, 862), item, COLORS["green"], (244, 249, 244))
        cx += 255
    img.save(FINAL / "slide-08-explainable-ai-score.png")


def slide_09():
    img = base("slide-09-cloud-architecture.raw.png")
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 09", "Architecture dibuat hemat, aman, dan siap demo cloud.", "Google Cloud credit dipakai untuk reliability dan security, bukan infrastruktur mahal.")
    nodes = [
        ("User", 90, 480, COLORS["ink"]),
        ("Next.js App", 385, 480, COLORS["green"]),
        ("Server API", 700, 480, COLORS["blue"]),
        ("Aggregate Layer", 1015, 480, COLORS["gold"]),
        ("PostgreSQL SSL", 1330, 480, COLORS["red"]),
        ("Laporan Aksi", 1600, 480, COLORS["brown"]),
    ]
    for i, (label, x, y, color) in enumerate(nodes):
        shadowed_card(d, (x, y, x + 230, y + 120), (255, 255, 255, 238))
        draw_text(d, (x + 24, y + 40), label, 25, color, True, 180)
        if i < len(nodes) - 1:
            line_arrow(d, (x + 230, y + 60), (nodes[i + 1][1] - 8, y + 60), COLORS["ink"], 4)
    guardrails = ["HttpOnly session", "role-gated routes", "CSRF/same-origin", "Secret Manager", "Cloud Logging", "Budget Alert", "no PII demo"]
    for i, item in enumerate(guardrails):
        x = 170 + (i % 4) * 410
        y = 715 + (i // 4) * 92
        chip(d, (x, y), item, [COLORS["green"], COLORS["blue"], COLORS["red"], COLORS["gold"]][i % 4], (255, 252, 245))
    img.save(FINAL / "slide-09-cloud-architecture.png")


def slide_10():
    img = base("slide-10-business-impact.raw.png")
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 10", "Dampak diukur dari pipeline yang bergerak, bukan jumlah fitur.", "Wedge: decision support dan trust layer sebelum marketplace checkout.")
    steps = ["Data readiness", "Verified opportunity", "Approved recommendation", "Buyer outreach", "Stock readiness", "Action report used"]
    for i, step in enumerate(steps):
        x = 140 + i * 285
        y = 810 - i * 80
        shadowed_card(d, (x, y, x + 245, y + 100), (255, 255, 255, 238))
        draw_text(d, (x + 22, y + 24), step, 23, COLORS["ink"], True, 200)
        if i < len(steps) - 1:
            line_arrow(d, (x + 245, y + 50), (x + 285, y - 30), COLORS["green"], 5)
    lanes = ["Managed platform", "Implementation support", "Buyer workflow", "Reporting service"]
    for i, lane in enumerate(lanes):
        chip(d, (190 + i * 420, 935), lane, [COLORS["green"], COLORS["gold"], COLORS["blue"], COLORS["red"]][i], (255, 252, 245))
    img.save(FINAL / "slide-10-business-impact.png")


def slide_11():
    img = base(None)
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 11", "Team profile and roles.", "Ganti placeholder dengan nama anggota final sebelum submit.")
    roles = [
        ("Product & Pitch Lead", "problem framing, story, Q&A"),
        ("Tech Lead", "Next.js, API, auth, deploy"),
        ("Data & AI Lead", "scoring, source labels, analytics"),
        ("Design Lead", "dashboard UX, slide visual system"),
        ("Demo & Ops Lead", "QA, video, submission checklist"),
    ]
    for i, (role, desc) in enumerate(roles):
        x = 120 + (i % 3) * 585
        y = 380 + (i // 3) * 260
        shadowed_card(d, (x, y, x + 500, y + 190), (255, 255, 255, 238))
        rounded(d, (x + 30, y + 34, x + 92, y + 96), [COLORS["red"], COLORS["green"], COLORS["gold"], COLORS["blue"], COLORS["brown"]][i], radius=20)
        draw_text(d, (x + 118, y + 34), role, 29, COLORS["ink"], True, 330)
        draw_text(d, (x + 118, y + 98), desc, 23, COLORS["muted"], False, 330)
        draw_text(d, (x + 30, y + 132), "Nama: __________________", 23, COLORS["brown"], False)
    chip(d, (120, 930), "tampilkan pembagian ownership, bukan hanya daftar nama", COLORS["green"], (244, 249, 244))
    img.save(FINAL / "slide-11-team-role-grid.png")


def slide_12():
    img = base("slide-12-submission-readiness.raw.png")
    d = ImageDraw.Draw(img, "RGBA")
    title(d, "Slide 12", "Submission package and demo readiness.", "Pastikan repo, PDF, demo URL, dan akun juri siap sebelum upload.")
    items = [
        ("Public source repo", "README install + architecture"),
        ("Pitch deck PDF", "10-12 slide maksimum"),
        ("Live demo URL", "test account di deskripsi"),
        ("Optional video", "screen recording <= 3 menit"),
    ]
    for i, (head, sub) in enumerate(items):
        x = 120 + (i % 2) * 850
        y = 390 + (i // 2) * 190
        shadowed_card(d, (x, y, x + 720, y + 145), (255, 255, 255, 240))
        rounded(d, (x + 32, y + 38, x + 82, y + 88), COLORS["green"], radius=14)
        draw_text(d, (x + 105, y + 30), head, 33, COLORS["ink"], True)
        draw_text(d, (x + 106, y + 82), sub, 24, COLORS["muted"], False)
    flow = ["login", "peta", "score", "buyer", "readiness", "laporan"]
    for i, step in enumerate(flow):
        x = 210 + i * 260
        y = 830
        rounded(d, (x, y, x + 170, y + 70), (255, 252, 245, 240), outline=COLORS["line"], width=2, radius=18)
        draw_text(d, (x + 30, y + 20), step, 25, COLORS["ink"], True)
        if i < len(flow) - 1:
            line_arrow(d, (x + 170, y + 35), (x + 240, y + 35), COLORS["green"], 4)
    chip(d, (120, 970), "no secrets, no PII, test-only account", COLORS["red"], (255, 244, 244))
    img.save(FINAL / "slide-12-submission-readiness.png")


def contact_sheet(paths: Iterable[Path]):
    thumbs = []
    for path in paths:
        im = Image.open(path).convert("RGB").resize((480, 270), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (520, 340), COLORS["paper2"])
        canvas.paste(im, (20, 20))
        d = ImageDraw.Draw(canvas)
        draw_text(d, (22, 300), path.name, 18, COLORS["ink"], True, 476)
        thumbs.append(canvas)
    cols = 3
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 520, rows * 340), COLORS["paper"])
    for idx, thumb in enumerate(thumbs):
        sheet.paste(thumb, ((idx % cols) * 520, (idx // cols) * 340))
    sheet.save(FINAL / "contact-sheet-final.png")


def main():
    FINAL.mkdir(parents=True, exist_ok=True)
    for fn in [slide_01, slide_02, slide_03, slide_04, slide_05, slide_06, slide_07, slide_08, slide_09, slide_10, slide_11, slide_12]:
        fn()
    paths = sorted(FINAL.glob("slide-*.png"))
    contact_sheet(paths)
    print(f"generated {len(paths)} slide visuals in {FINAL}")


if __name__ == "__main__":
    main()
