from __future__ import annotations

import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "output" / "hackathon_pitch_data_pack_2026-07-10" / "docs"
PDF_OUT = DOCS / "pdf"

SOURCES = [
    (DOCS / "PRESENTER_BRIEF_12_SLIDES.md", PDF_OUT / "Lumbung-Bersama-Presenter-Brief-12-Slides.pdf"),
    (DOCS / "JURY_QA_PLAYBOOK.md", PDF_OUT / "Lumbung-Bersama-Jury-QA-Playbook.pdf"),
    (DOCS / "CURRENT_PITCH_REVISION_AND_IMPLEMENTATION_PLAN.md", PDF_OUT / "Lumbung-Bersama-Revision-Implementation-Plan.pdf"),
]


def clean_inline(text: str) -> str:
    text = html.escape(text)
    text = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*([^*]+)\*", r"<i>\1</i>", text)
    return text


def make_styles():
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "DocTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=27,
            textColor=colors.HexColor("#1A1F23"),
            spaceAfter=16,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=17,
            leading=21,
            textColor=colors.HexColor("#B5262D"),
            spaceBefore=13,
            spaceAfter=7,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=17,
            textColor=colors.HexColor("#1A1F23"),
            spaceBefore=10,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.2,
            leading=13.2,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#1A1F23"),
            spaceAfter=5,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#5D635C"),
            spaceAfter=3,
        ),
        "quote": ParagraphStyle(
            "Quote",
            parent=base["BodyText"],
            fontName="Helvetica-Oblique",
            fontSize=9.2,
            leading=13.2,
            leftIndent=12,
            borderColor=colors.HexColor("#C98F32"),
            borderWidth=1.5,
            borderPadding=7,
            backColor=colors.HexColor("#FFF8EA"),
            textColor=colors.HexColor("#1A1F23"),
            spaceBefore=4,
            spaceAfter=8,
        ),
        "code": ParagraphStyle(
            "Code",
            parent=base["Code"],
            fontName="Courier",
            fontSize=7.5,
            leading=10,
            leftIndent=6,
            borderColor=colors.HexColor("#DAD2C2"),
            borderWidth=0.8,
            borderPadding=6,
            backColor=colors.HexColor("#FCF9F1"),
            textColor=colors.HexColor("#1A1F23"),
            spaceAfter=8,
        ),
    }
    return styles


def parse_table(lines: list[str], styles) -> Table:
    rows: list[list[Paragraph]] = []
    for line in lines:
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-{3,}:?", c or "") for c in cells):
            continue
        rows.append([Paragraph(clean_inline(cell), styles["small"]) for cell in cells])
    if not rows:
        rows = [[Paragraph("", styles["small"])]]
    col_count = max(len(row) for row in rows)
    for row in rows:
        while len(row) < col_count:
            row.append(Paragraph("", styles["small"]))
    usable_width = A4[0] - 3.0 * cm
    col_widths = [usable_width / col_count] * col_count
    table = Table(rows, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1A1F23")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#FFFDF8")),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#DAD2C2")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def md_to_story(md: str, styles) -> list:
    story: list = []
    lines = md.splitlines()
    i = 0
    pending_bullets: list[str] = []
    in_code = False
    code_lines: list[str] = []

    def flush_bullets():
        nonlocal pending_bullets
        if pending_bullets:
            items = [
                ListItem(Paragraph(clean_inline(item), styles["body"]), leftIndent=12)
                for item in pending_bullets
            ]
            story.append(ListFlowable(items, bulletType="bullet", leftIndent=13, bulletFontSize=6))
            story.append(Spacer(1, 4))
            pending_bullets = []

    while i < len(lines):
        line = lines[i].rstrip()

        if line.strip().startswith("```"):
            if in_code:
                story.append(Preformatted("\n".join(code_lines), styles["code"]))
                code_lines = []
                in_code = False
            else:
                flush_bullets()
                in_code = True
            i += 1
            continue

        if in_code:
            code_lines.append(line)
            i += 1
            continue

        if not line.strip():
            flush_bullets()
            i += 1
            continue

        if line.startswith("|") and i + 1 < len(lines) and lines[i + 1].startswith("|"):
            flush_bullets()
            tbl_lines = []
            while i < len(lines) and lines[i].startswith("|"):
                tbl_lines.append(lines[i])
                i += 1
            story.append(parse_table(tbl_lines, styles))
            story.append(Spacer(1, 8))
            continue

        if line.startswith("# "):
            flush_bullets()
            story.append(Paragraph(clean_inline(line[2:].strip()), styles["title"]))
            story.append(Spacer(1, 4))
            i += 1
            continue

        if line.startswith("## "):
            flush_bullets()
            heading = line[3:].strip()
            if heading.startswith("Slide ") or heading.startswith("Judge Persona"):
                story.append(PageBreak())
            story.append(Paragraph(clean_inline(heading), styles["h1"]))
            i += 1
            continue

        if line.startswith("### "):
            flush_bullets()
            story.append(Paragraph(clean_inline(line[4:].strip()), styles["h2"]))
            i += 1
            continue

        if line.startswith("> "):
            flush_bullets()
            quote_lines = []
            while i < len(lines) and lines[i].startswith("> "):
                quote_lines.append(lines[i][2:].strip())
                i += 1
            story.append(Paragraph(clean_inline(" ".join(quote_lines)), styles["quote"]))
            continue

        if re.match(r"^\s*-\s+", line):
            pending_bullets.append(re.sub(r"^\s*-\s+", "", line).strip())
            i += 1
            continue

        if re.match(r"^\s*\d+\.\s+", line):
            pending_bullets.append(re.sub(r"^\s*\d+\.\s+", "", line).strip())
            i += 1
            continue

        flush_bullets()
        story.append(Paragraph(clean_inline(line), styles["body"]))
        i += 1

    flush_bullets()
    if in_code and code_lines:
        story.append(Preformatted("\n".join(code_lines), styles["code"]))
    return story


def footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#5D635C"))
    canvas.drawString(1.5 * cm, 1.0 * cm, "Lumbung Bersama - Hackathon Tema 2")
    canvas.drawRightString(width - 1.5 * cm, 1.0 * cm, f"Page {doc.page}")
    canvas.restoreState()


def render(source: Path, target: Path):
    styles = make_styles()
    target.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(target),
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.35 * cm,
        bottomMargin=1.45 * cm,
        title=source.stem,
        author="Lumbung Bersama",
    )
    story = md_to_story(source.read_text(encoding="utf-8"), styles)
    doc.build(story, onFirstPage=footer, onLaterPages=footer)


def main():
    for source, target in SOURCES:
        render(source, target)
        print(target)


if __name__ == "__main__":
    main()
