"""
DRISHTI PDF Generator
Converts ARCHITECTURE.md and IMPACT_MODEL.md to styled PDFs using ReportLab.
"""

import re
import os

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer,
    Table, TableStyle, HRFlowable, Preformatted, KeepTogether
)
from reportlab.platypus.flowables import Flowable

# ---------------------------------------------------------------------------
# Font setup
# ---------------------------------------------------------------------------
ARIAL_UNICODE_PATH = "/Library/Fonts/Arial Unicode.ttf"
USE_UNICODE_FONT = os.path.exists(ARIAL_UNICODE_PATH)

if USE_UNICODE_FONT:
    pdfmetrics.registerFont(TTFont("ArialUnicode", ARIAL_UNICODE_PATH))
    pdfmetrics.registerFont(TTFont("ArialUnicodeBold", ARIAL_UNICODE_PATH))
    BODY_FONT = "ArialUnicode"
    BODY_FONT_BOLD = "ArialUnicode"
else:
    BODY_FONT = "Helvetica"
    BODY_FONT_BOLD = "Helvetica-Bold"

CODE_FONT = "Courier"

# ---------------------------------------------------------------------------
# Colour palette
# ---------------------------------------------------------------------------
HEADER_BG = colors.HexColor("#0D1B2A")
HEADER_FG = colors.white
CODE_BG    = colors.HexColor("#F3F4F6")
RULE_COLOR = colors.HexColor("#CBD5E1")
TABLE_HEADER_BG = colors.HexColor("#1E3A5F")
TABLE_ALT_BG    = colors.HexColor("#F8FAFC")
BODY_COLOR = colors.black

# ---------------------------------------------------------------------------
# Page geometry
# ---------------------------------------------------------------------------
PAGE_W, PAGE_H = A4          # 595 x 842 pt
MARGIN_L = 22 * mm
MARGIN_R = 22 * mm
MARGIN_T = 28 * mm
MARGIN_B = 20 * mm
HEADER_H = 18 * mm

# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------
def make_styles(doc_title: str):
    """Return a dict of ParagraphStyle objects."""
    base = dict(fontName=BODY_FONT, textColor=BODY_COLOR, leading=14)

    h1 = ParagraphStyle("H1", fontName=BODY_FONT_BOLD, fontSize=20,
                         textColor=BODY_COLOR, spaceAfter=6, spaceBefore=14,
                         leading=26)
    h2 = ParagraphStyle("H2", fontName=BODY_FONT_BOLD, fontSize=16,
                         textColor=colors.HexColor("#1E3A5F"),
                         spaceAfter=4, spaceBefore=12, leading=22)
    h3 = ParagraphStyle("H3", fontName=BODY_FONT_BOLD, fontSize=13,
                         textColor=colors.HexColor("#2D5A8E"),
                         spaceAfter=3, spaceBefore=8, leading=18)
    body = ParagraphStyle("Body", **base, fontSize=10, spaceAfter=4)
    bullet = ParagraphStyle("Bullet", **base, fontSize=10,
                              leftIndent=14, firstLineIndent=0,
                              spaceAfter=3, bulletIndent=4)
    code = ParagraphStyle("Code", fontName=CODE_FONT, fontSize=8,
                           textColor=colors.HexColor("#1F2937"),
                           backColor=CODE_BG, leading=12,
                           leftIndent=8, rightIndent=8,
                           spaceAfter=2)
    table_hdr = ParagraphStyle("TH", fontName=BODY_FONT_BOLD, fontSize=9,
                                 textColor=colors.white, leading=12)
    table_cell = ParagraphStyle("TD", fontName=BODY_FONT, fontSize=9,
                                  textColor=BODY_COLOR, leading=12)
    return dict(h1=h1, h2=h2, h3=h3, body=body, bullet=bullet,
                code=code, table_hdr=table_hdr, table_cell=table_cell)


# ---------------------------------------------------------------------------
# Header / Footer callback
# ---------------------------------------------------------------------------
def make_page_callback(doc_title: str):
    def on_page(canvas, doc):
        canvas.saveState()
        # Dark header bar
        canvas.setFillColor(HEADER_BG)
        canvas.rect(0, PAGE_H - HEADER_H, PAGE_W, HEADER_H, fill=1, stroke=0)
        # Title text in header
        canvas.setFillColor(HEADER_FG)
        canvas.setFont(BODY_FONT_BOLD if USE_UNICODE_FONT else "Helvetica-Bold", 11)
        canvas.drawString(MARGIN_L, PAGE_H - HEADER_H + 5.5 * mm, doc_title)
        # Page number (right-aligned in header)
        page_str = f"Page {doc.page}"
        canvas.setFont(BODY_FONT if USE_UNICODE_FONT else "Helvetica", 9)
        canvas.drawRightString(PAGE_W - MARGIN_R, PAGE_H - HEADER_H + 5.5 * mm, page_str)
        canvas.restoreState()
    return on_page


# ---------------------------------------------------------------------------
# Markdown parser → ReportLab flowables
# ---------------------------------------------------------------------------
def sanitize_inline(text: str) -> str:
    """
    Convert common inline markdown to ReportLab XML-safe markup.
    Strategy: first extract markdown spans, then escape HTML entities in
    the plain-text portions, then reassemble with XML tags.
    """
    # Step 1: pull out inline code segments (protect from further processing)
    code_spans = []
    def stash_code(m):
        idx = len(code_spans)
        code_spans.append(m.group(1))
        return f"\x00CODE{idx}\x00"
    text = re.sub(r"`([^`]+)`", stash_code, text)

    # Step 2: escape HTML entities in remaining text
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")

    # Step 3: apply bold/italic markdown (safe now that < > are escaped)
    # Bold-italic ***
    text = re.sub(r"\*\*\*(.+?)\*\*\*", r"<b><i>\1</i></b>", text)
    # Bold **
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    # Italic * (single asterisk, not double)
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<i>\1</i>", text)

    # Step 4: restore inline code as monospace font tags
    def restore_code(m):
        idx = int(m.group(1))
        inner = code_spans[idx].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        return f'<font name="{CODE_FONT}" size="8">{inner}</font>'
    text = re.sub(r"\x00CODE(\d+)\x00", restore_code, text)

    return text


def md_to_flowables(md_text: str, styles: dict, doc_title: str) -> list:
    """Parse markdown and return a list of ReportLab flowables."""
    lines = md_text.splitlines()
    flowables = []

    in_code_block = False
    code_lines = []
    in_table = False
    table_rows = []
    table_header_done = False

    def flush_table():
        nonlocal table_rows, in_table, table_header_done
        if not table_rows:
            return
        # Build table data with Paragraphs
        data = []
        col_count = max(len(r) for r in table_rows)
        for i, row in enumerate(table_rows):
            # Pad short rows
            while len(row) < col_count:
                row.append("")
            style = styles["table_hdr"] if i == 0 else styles["table_cell"]
            data.append([Paragraph(sanitize_inline(cell.strip()), style) for cell in row])

        # Column widths: distribute evenly across usable width
        usable_w = PAGE_W - MARGIN_L - MARGIN_R
        col_w = usable_w / col_count

        ts = TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
            ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
            ("FONTNAME",   (0, 0), (-1, 0), BODY_FONT_BOLD if USE_UNICODE_FONT else "Helvetica-Bold"),
            ("FONTSIZE",   (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, TABLE_ALT_BG]),
            ("GRID",       (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
            ("VALIGN",     (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING",  (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING",   (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
        ])
        tbl = Table(data, colWidths=[col_w] * col_count, style=ts,
                    repeatRows=1, hAlign="LEFT")
        flowables.append(tbl)
        flowables.append(Spacer(1, 6))
        table_rows = []
        in_table = False
        table_header_done = False

    def flush_code():
        nonlocal code_lines, in_code_block
        if code_lines:
            code_text = "\n".join(code_lines)
            # Use Preformatted for monospace; wrap in a table cell for bg colour
            pre = Preformatted(code_text, styles["code"])
            # Wrap in a single-cell table for the background box
            code_tbl = Table(
                [[pre]],
                colWidths=[PAGE_W - MARGIN_L - MARGIN_R],
                style=TableStyle([
                    ("BACKGROUND", (0, 0), (0, 0), CODE_BG),
                    ("BOX",        (0, 0), (0, 0), 0.5, colors.HexColor("#D1D5DB")),
                    ("LEFTPADDING",  (0, 0), (0, 0), 8),
                    ("RIGHTPADDING", (0, 0), (0, 0), 8),
                    ("TOPPADDING",   (0, 0), (0, 0), 6),
                    ("BOTTOMPADDING",(0, 0), (0, 0), 6),
                ]),
                hAlign="LEFT"
            )
            flowables.append(code_tbl)
            flowables.append(Spacer(1, 6))
        code_lines = []
        in_code_block = False

    i = 0
    while i < len(lines):
        line = lines[i]

        # ---- Code fence ----
        if line.strip().startswith("```"):
            if in_code_block:
                flush_code()
            else:
                if in_table:
                    flush_table()
                in_code_block = True
                code_lines = []
            i += 1
            continue

        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        # ---- Table row ----
        if line.strip().startswith("|") and line.strip().endswith("|"):
            # Separator row like |---|---|
            if re.match(r"^\s*\|[\s\-:|]+\|\s*$", line):
                i += 1
                continue
            cells = [c for c in line.strip().split("|") if c != ""]
            if not in_table:
                in_table = True
                table_header_done = False
            table_rows.append(cells)
            i += 1
            continue
        else:
            if in_table:
                flush_table()

        # ---- HR ----
        if re.match(r"^\s*---+\s*$", line):
            flowables.append(HRFlowable(width="100%", thickness=0.5,
                                         color=RULE_COLOR, spaceAfter=6, spaceBefore=6))
            i += 1
            continue

        # ---- Headings ----
        m = re.match(r"^(#{1,3})\s+(.*)", line)
        if m:
            level = len(m.group(1))
            text = sanitize_inline(m.group(2))
            style = styles[f"h{level}"]
            flowables.append(Paragraph(text, style))
            i += 1
            continue

        # ---- Bullet points ----
        m = re.match(r"^\s*[-*]\s+(.*)", line)
        if m:
            text = sanitize_inline(m.group(1))
            flowables.append(Paragraph(f"• {text}", styles["bullet"]))
            i += 1
            continue

        # ---- Blank line ----
        if line.strip() == "":
            flowables.append(Spacer(1, 4))
            i += 1
            continue

        # ---- Regular paragraph ----
        text = sanitize_inline(line.strip())
        if text:
            flowables.append(Paragraph(text, styles["body"]))
        i += 1

    # Flush any open blocks
    if in_code_block:
        flush_code()
    if in_table:
        flush_table()

    return flowables


# ---------------------------------------------------------------------------
# PDF builder
# ---------------------------------------------------------------------------
def build_pdf(md_path: str, pdf_path: str, doc_title: str):
    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    styles = make_styles(doc_title)
    callback = make_page_callback(doc_title)

    # Frame starts below the header bar
    frame_y = MARGIN_B
    frame_h = PAGE_H - HEADER_H - MARGIN_B - 4 * mm
    frame = Frame(MARGIN_L, frame_y,
                  PAGE_W - MARGIN_L - MARGIN_R,
                  frame_h,
                  leftPadding=0, rightPadding=0,
                  topPadding=6, bottomPadding=0)

    page_template = PageTemplate(id="main", frames=[frame],
                                  onPage=callback)

    doc = BaseDocTemplate(
        pdf_path,
        pagesize=A4,
        pageTemplates=[page_template],
        title=doc_title,
        author="DRISHTI — BharatNivesh AI",
        subject="ET Gen AI Hackathon 2025",
    )

    flowables = md_to_flowables(md_text, styles, doc_title)
    doc.build(flowables)
    print(f"  Written: {pdf_path}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    DOCS_DIR = os.path.dirname(os.path.abspath(__file__))

    tasks = [
        (
            os.path.join(DOCS_DIR, "ARCHITECTURE.md"),
            os.path.join(DOCS_DIR, "DRISHTI_Architecture.pdf"),
            "DRISHTI — Architecture Document",
        ),
        (
            os.path.join(DOCS_DIR, "IMPACT_MODEL.md"),
            os.path.join(DOCS_DIR, "DRISHTI_Impact_Model.pdf"),
            "DRISHTI — Impact Model",
        ),
    ]

    print(f"Font: {'Arial Unicode MS (TTF)' if USE_UNICODE_FONT else 'Helvetica (fallback)'}\n")

    for md_path, pdf_path, title in tasks:
        print(f"Generating: {os.path.basename(pdf_path)} ...")
        build_pdf(md_path, pdf_path, title)

    print("\nDone.")
