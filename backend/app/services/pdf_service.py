import io
import re
from typing import Dict, Any, List
from xml.sax.saxutils import escape
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    HRFlowable,
    Table,
    TableStyle,
)


def _safe_text(val: Any) -> str:
    if val is None:
        return ""
    return escape(str(val).strip())


def _format_rich_text(val: Any) -> str:
    """
    Escapes XML safely and converts inline formatting syntax:
    - **bold** -> <b>bold</b>
    - *italic* -> <i>italic</i>
    - __underline__ or [u]underline[/u] or <u>underline</u> -> <u>underline</u>
    """
    if val is None:
        return ""
    raw = str(val).strip()
    # Temporarily tokenize <b>, <i>, <u> tags if present before escaping
    raw = re.sub(r"<\s*u\s*>(.*?)<\s*\/\s*u\s*>", r"__UL_START__\1__UL_END__", raw, flags=re.IGNORECASE)
    raw = re.sub(r"<\s*b\s*>(.*?)<\s*\/\s*b\s*>", r"__B_START__\1__B_END__", raw, flags=re.IGNORECASE)
    raw = re.sub(r"<\s*i\s*>(.*?)<\s*\/\s*i\s*>", r"__I_START__\1__I_END__", raw, flags=re.IGNORECASE)

    escaped = escape(raw)

    # Convert **bold**, *italic*, __underline__
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"(?<!\*)\*([^\*]+?)\*(?!\*)", r"<i>\1</i>", escaped)
    escaped = re.sub(r"__(.+?)__", r"<u>\1</u>", escaped)

    escaped = escaped.replace("__UL_START__", "<u>").replace("__UL_END__", "</u>")
    escaped = escaped.replace("__B_START__", "<b>").replace("__B_END__", "</b>")
    escaped = escaped.replace("__I_START__", "<i>").replace("__I_END__", "</i>")
    return escaped


def _sanitize_link(u: str) -> str:
    u = (u or "").strip()
    if not u:
        return ""
    if not u.startswith("http://") and not u.startswith("https://") and not u.startswith("mailto:"):
        return "https://" + u
    return u


FONT_MAP = {
    "sans": ("Helvetica", "Helvetica-Bold", "Helvetica-Oblique"),
    "serif": ("Times-Roman", "Times-Bold", "Times-Italic"),
    "mono": ("Courier", "Courier-Bold", "Courier-Oblique"),
    "calibri": ("Helvetica", "Helvetica-Bold", "Helvetica-Oblique"),
}


def build_ats_resume_pdf(resume_data: Dict[str, Any]) -> io.BytesIO:
    """
    Generates a single-column, machine-readable, Harvard/Executive ATS-compliant PDF resume using ReportLab.
    Supports:
    - Custom Font Families (Sans/Helvetica, Serif/Times, Mono/Courier)
    - Custom Font Size & Line Spacing (Compact, Standard, Comfortable)
    - Custom Theme Accent Color
    - Inline Rich Text Styling (**bold**, *italic*, __underline__ / <u>underline</u>)
    - Bordered Skills Table Mode & Custom Multi-Column Tables
    - Name, Designation, Contact + Multiple Clickable Links
    """
    style_cfg = resume_data.get("style_settings", {}) or {}
    font_key = style_cfg.get("font_family", "sans")
    font_reg, font_bold, font_italic = FONT_MAP.get(font_key, FONT_MAP["sans"])

    size_key = style_cfg.get("font_size", "standard")
    size_scale = 0.92 if size_key == "compact" else (1.08 if size_key == "comfortable" else 1.0)

    spacing_key = style_cfg.get("line_spacing", "normal")
    leading_scale = 0.92 if spacing_key == "tight" else (1.12 if spacing_key == "relaxed" else 1.0)

    accent_hex = style_cfg.get("accent_color") or "#1E3A8A"
    if not re.match(r"^#[0-9A-Fa-f]{6}$", str(accent_hex)):
        accent_hex = "#1E3A8A"
    accent_color = colors.HexColor(accent_hex)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=30,
        bottomMargin=30
    )
    printable_width = 540

    styles = getSampleStyleSheet()

    name_style = ParagraphStyle(
        "ATSName",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=round(19 * size_scale, 1),
        leading=round(22 * size_scale * leading_scale, 1),
        alignment=1,
        textColor=colors.HexColor("#111827")
    )

    headline_style = ParagraphStyle(
        "ATSHeadline",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=round(10.5 * size_scale, 1),
        leading=round(14 * size_scale * leading_scale, 1),
        alignment=1,
        textColor=accent_color
    )

    contact_style = ParagraphStyle(
        "ATSContact",
        parent=styles["Normal"],
        fontName=font_reg,
        fontSize=round(9 * size_scale, 1),
        leading=round(12.5 * size_scale * leading_scale, 1),
        alignment=1,
        textColor=colors.HexColor("#4B5563")
    )

    section_heading_style = ParagraphStyle(
        "ATSSectionHeading",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=round(10.5 * size_scale, 1),
        leading=round(13 * size_scale * leading_scale, 1),
        textColor=accent_color,
        spaceBefore=6,
        spaceAfter=2,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        "ATSBody",
        parent=styles["Normal"],
        fontName=font_reg,
        fontSize=round(9.3 * size_scale, 1),
        leading=round(13 * size_scale * leading_scale, 1),
        textColor=colors.HexColor("#1F2937")
    )

    skill_line_style = ParagraphStyle(
        "ATSSkillLine",
        parent=styles["Normal"],
        fontName=font_reg,
        fontSize=round(9.2 * size_scale, 1),
        leading=round(12.8 * size_scale * leading_scale, 1),
        textColor=colors.HexColor("#1F2937"),
        spaceAfter=1.5
    )

    left_bold_style = ParagraphStyle(
        "ATSLeftBold",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=round(9.8 * size_scale, 1),
        leading=round(12.5 * size_scale * leading_scale, 1),
        textColor=colors.HexColor("#111827")
    )

    right_meta_style = ParagraphStyle(
        "ATSRightMeta",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=round(9.2 * size_scale, 1),
        leading=round(12.5 * size_scale * leading_scale, 1),
        alignment=2,
        textColor=colors.HexColor("#374151")
    )

    left_sub_style = ParagraphStyle(
        "ATSLeftSub",
        parent=styles["Normal"],
        fontName=font_italic,
        fontSize=round(9.2 * size_scale, 1),
        leading=round(12 * size_scale * leading_scale, 1),
        textColor=colors.HexColor("#374151")
    )

    right_sub_style = ParagraphStyle(
        "ATSRightSub",
        parent=styles["Normal"],
        fontName=font_italic,
        fontSize=round(9 * size_scale, 1),
        leading=round(12 * size_scale * leading_scale, 1),
        alignment=2,
        textColor=colors.HexColor("#4B5563")
    )

    bullet_style = ParagraphStyle(
        "ATSBullet",
        parent=styles["Normal"],
        fontName=font_reg,
        fontSize=round(9.1 * size_scale, 1),
        leading=round(12.6 * size_scale * leading_scale, 1),
        leftIndent=14,
        firstLineIndent=-9,
        textColor=colors.HexColor("#1F2937"),
        spaceAfter=1
    )

    table_header_style = ParagraphStyle(
        "ATSTableHeader",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=round(9 * size_scale, 1),
        leading=round(11.5 * size_scale, 1),
        textColor=colors.HexColor("#111827")
    )

    table_cell_style = ParagraphStyle(
        "ATSTableCell",
        parent=styles["Normal"],
        fontName=font_reg,
        fontSize=round(8.9 * size_scale, 1),
        leading=round(11.5 * size_scale, 1),
        textColor=colors.HexColor("#1F2937")
    )

    story = []

    # 1. HEADER: Full Name, Designation, Contact & Links
    contact = resume_data.get("contact_info", {}) or {}
    name = _safe_text(contact.get("full_name") or resume_data.get("full_name") or resume_data.get("title") or "Candidate Name")
    story.append(Paragraph(name, name_style))

    designation = _safe_text(
        resume_data.get("designation")
        or resume_data.get("headline")
        or contact.get("designation")
        or contact.get("headline")
        or ""
    )
    if designation:
        story.append(Spacer(1, 2))
        story.append(Paragraph(designation, headline_style))

    story.append(Spacer(1, 3))

    contact_parts = []
    if contact.get("email"):
        email_clean = _safe_text(contact["email"])
        contact_parts.append(f'<a href="mailto:{email_clean}" color="{accent_hex}">{email_clean}</a>')
    if contact.get("phone"):
        contact_parts.append(_safe_text(contact["phone"]))
    if contact.get("location"):
        contact_parts.append(_safe_text(contact["location"]))
    if contact.get("linkedin"):
        link_url = _sanitize_link(contact["linkedin"])
        contact_parts.append(f'<a href="{link_url}" color="{accent_hex}"><u>LinkedIn</u></a>')
    if contact.get("github"):
        link_url = _sanitize_link(contact["github"])
        contact_parts.append(f'<a href="{link_url}" color="{accent_hex}"><u>GitHub</u></a>')
    if contact.get("portfolio") or resume_data.get("portfolio"):
        port_url = _sanitize_link(contact.get("portfolio") or resume_data.get("portfolio"))
        contact_parts.append(f'<a href="{port_url}" color="{accent_hex}"><u>Portfolio</u></a>')

    custom_links = resume_data.get("custom_links") or contact.get("custom_links") or []
    if isinstance(custom_links, list):
        for link_item in custom_links:
            if isinstance(link_item, dict) and link_item.get("url"):
                lbl = _safe_text(link_item.get("label") or "Link")
                l_url = _sanitize_link(link_item["url"])
                contact_parts.append(f'<a href="{l_url}" color="{accent_hex}"><u>{lbl}</u></a>')

    if contact_parts:
        story.append(Paragraph(" &bull; ".join(contact_parts), contact_style))
        story.append(Spacer(1, 6))

    def add_section_divider(title_str: str):
        story.append(Paragraph(_safe_text(title_str).upper(), section_heading_style))
        story.append(HRFlowable(width="100%", thickness=0.85, color=accent_color, spaceAfter=4))

    def add_two_col_row(left_para: Paragraph, right_para: Paragraph):
        tbl = Table(
            [[left_para, right_para]],
            colWidths=[printable_width * 0.72, printable_width * 0.28]
        )
        tbl.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))
        story.append(tbl)

    # 2. PROFESSIONAL SUMMARY
    summary = resume_data.get("summary")
    if summary and str(summary).strip():
        add_section_divider("Professional Summary")
        story.append(Paragraph(_format_rich_text(summary), body_style))
        story.append(Spacer(1, 4))

    # 3. CATEGORIZED TECHNICAL SKILLS (Rows or Table Mode)
    skill_categories = resume_data.get("skill_categories")
    skills_display_mode = style_cfg.get("skills_display_mode") or resume_data.get("skills_display_mode") or "rows"
    has_categorized_skills = False

    if isinstance(skill_categories, list) and len(skill_categories) > 0:
        valid_cats = [
            c for c in skill_categories
            if isinstance(c, dict) and c.get("category") and c.get("skills") and len(c.get("skills")) > 0
        ]
        if valid_cats:
            has_categorized_skills = True
            add_section_divider("Technical Skills")
            if skills_display_mode == "table":
                tbl_rows = []
                for cat_obj in valid_cats:
                    cat_name = _safe_text(cat_obj["category"])
                    cat_skills = [_safe_text(s) for s in cat_obj["skills"] if str(s).strip()]
                    if cat_skills:
                        tbl_rows.append([
                            Paragraph(f"<b>{cat_name}</b>", table_header_style),
                            Paragraph(", ".join(cat_skills), table_cell_style)
                        ])
                if tbl_rows:
                    sk_tbl = Table(tbl_rows, colWidths=[printable_width * 0.30, printable_width * 0.70])
                    sk_tbl.setStyle(TableStyle([
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F8FAFC")),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
                    ]))
                    story.append(sk_tbl)
            else:
                for cat_obj in valid_cats:
                    cat_name = _safe_text(cat_obj["category"])
                    cat_skills = [_safe_text(s) for s in cat_obj["skills"] if str(s).strip()]
                    if cat_skills:
                        story.append(
                            Paragraph(f"<b>{cat_name}:</b> {', '.join(cat_skills)}", skill_line_style)
                        )
            story.append(Spacer(1, 4))

    if not has_categorized_skills:
        skills_raw = resume_data.get("skills") or resume_data.get("skills_raw") or resume_data.get("extracted_skills", [])
        if skills_raw:
            add_section_divider("Technical Skills")
            if isinstance(skills_raw, list):
                if skills_raw and isinstance(skills_raw[0], dict):
                    skill_names = [_safe_text(s.get("canonical_name", s.get("name", ""))) for s in skills_raw if s.get("canonical_name") or s.get("name")]
                    skills_text = ", ".join(skill_names)
                else:
                    skills_text = ", ".join(_safe_text(s) for s in skills_raw if str(s).strip())
            else:
                skills_text = _safe_text(skills_raw)
            story.append(Paragraph(f"<b>Core Technologies:</b> {skills_text}", body_style))
            story.append(Spacer(1, 4))

    # 4. WORK EXPERIENCE
    experiences = resume_data.get("experiences") or resume_data.get("experience", [])
    if experiences and isinstance(experiences, list):
        valid_exps = [e for e in experiences if isinstance(e, dict) and (e.get("company") or e.get("role_title") or e.get("role"))]
        if valid_exps:
            add_section_divider("Work Experience")
            for exp in valid_exps:
                company = _safe_text(exp.get("company") or "Organization")
                role = _safe_text(exp.get("role_title") or exp.get("role") or "Professional Role")
                dates = _safe_text(f"{exp.get('start_date', '')} – {'Present' if exp.get('is_current') else exp.get('end_date', '')}".strip(" –-"))
                location = _safe_text(exp.get("location") or "")
                emp_type = _safe_text(exp.get("employment_type") or "")

                role_header = f"<b>{role}</b>"
                if emp_type:
                    role_header += f" ({emp_type})"

                add_two_col_row(
                    Paragraph(role_header, left_bold_style),
                    Paragraph(dates, right_meta_style)
                )

                if company or location:
                    add_two_col_row(
                        Paragraph(company, left_sub_style),
                        Paragraph(location, right_sub_style)
                    )

                for b in (exp.get("bullets") or []):
                    if str(b).strip():
                        story.append(Paragraph(f"&bull; {_format_rich_text(b)}", bullet_style))
                story.append(Spacer(1, 4))
    elif resume_data.get("experience_raw"):
        add_section_divider("Work Experience")
        for line in str(resume_data["experience_raw"]).split("\n"):
            if line.strip():
                story.append(Paragraph(_format_rich_text(line.strip()), body_style))
        story.append(Spacer(1, 4))

    # 5. PROJECTS & TECHNICAL HIGHLIGHTS
    projects = resume_data.get("projects", [])
    if projects and isinstance(projects, list):
        valid_projs = [p for p in projects if isinstance(p, dict) and (p.get("title") or p.get("description") or p.get("bullets"))]
        if valid_projs:
            add_section_divider("Projects")
            for proj in valid_projs:
                title = _safe_text(proj.get("title") or "Project")
                techs_raw = proj.get("technologies") or []
                techs = ", ".join(_safe_text(t) for t in techs_raw if str(t).strip()) if isinstance(techs_raw, list) else _safe_text(techs_raw)
                proj_date = _safe_text(proj.get("date") or "")

                title_line = f"<b>{title}</b>"
                if techs:
                    title_line += f" | <i>{techs}</i>"
                if proj.get("repo_url"):
                    repo_link = _sanitize_link(proj["repo_url"])
                    title_line += f' &mdash; <a href="{repo_link}" color="{accent_hex}"><u>GitHub</u></a>'
                if proj.get("live_url"):
                    live_link = _sanitize_link(proj["live_url"])
                    title_line += f' &mdash; <a href="{live_link}" color="{accent_hex}"><u>Live Demo</u></a>'

                if proj_date:
                    add_two_col_row(
                        Paragraph(title_line, left_bold_style),
                        Paragraph(proj_date, right_meta_style)
                    )
                else:
                    story.append(Paragraph(title_line, left_bold_style))

                bullets = proj.get("bullets", [])
                if bullets and isinstance(bullets, list) and any(str(b).strip() for b in bullets):
                    for b in bullets:
                        if str(b).strip():
                            story.append(Paragraph(f"&bull; {_format_rich_text(b)}", bullet_style))
                elif proj.get("description"):
                    story.append(Paragraph(f"&bull; {_format_rich_text(proj['description'])}", bullet_style))
                story.append(Spacer(1, 4))
    elif resume_data.get("projects_raw"):
        add_section_divider("Projects")
        for line in str(resume_data["projects_raw"]).split("\n"):
            if line.strip():
                story.append(Paragraph(_format_rich_text(line.strip()), body_style))
        story.append(Spacer(1, 4))

    # 6. EDUCATION
    educations = resume_data.get("educations") or resume_data.get("education", [])
    if educations and isinstance(educations, list):
        valid_edus = [ed for ed in educations if isinstance(ed, dict) and (ed.get("degree") or ed.get("institution"))]
        if valid_edus:
            add_section_divider("Education")
            for edu in valid_edus:
                deg = _safe_text(edu.get("degree") or "Degree")
                field = _safe_text(edu.get("field_of_study") or "")
                inst = _safe_text(edu.get("institution") or "Institution")
                edu_loc = _safe_text(edu.get("location") or "")
                dates = _safe_text(f"{edu.get('start_date', '')} – {edu.get('end_date', '')}".strip(" –-"))
                gpa = _safe_text(edu.get("gpa") or "")
                honors = _format_rich_text(edu.get("honors") or "")

                deg_title = f"<b>{inst}</b>"
                add_two_col_row(
                    Paragraph(deg_title, left_bold_style),
                    Paragraph(dates, right_meta_style)
                )

                sub_deg = f"{deg}{(' in ' + field) if field else ''}"
                right_gpa = f"GPA: {gpa}" if gpa else edu_loc
                add_two_col_row(
                    Paragraph(sub_deg, left_sub_style),
                    Paragraph(right_gpa, right_sub_style)
                )

                if honors:
                    story.append(Paragraph(f"&bull; <b>Coursework &amp; Honors:</b> {honors}", bullet_style))
                story.append(Spacer(1, 3))
    elif resume_data.get("education_raw"):
        add_section_divider("Education")
        for line in str(resume_data["education_raw"]).split("\n"):
            if line.strip():
                story.append(Paragraph(_format_rich_text(line.strip()), body_style))
        story.append(Spacer(1, 4))

    # 7. CUSTOM TABLES (Metrics, Publications, Coursework Matrices, etc.)
    custom_tables = resume_data.get("custom_tables") or []
    if isinstance(custom_tables, list) and len(custom_tables) > 0:
        for tbl_obj in custom_tables:
            if not isinstance(tbl_obj, dict):
                continue
            tbl_title = _safe_text(tbl_obj.get("title") or "Additional Details")
            headers = tbl_obj.get("headers") or []
            rows = tbl_obj.get("rows") or []
            if not headers and not rows:
                continue

            add_section_divider(tbl_title)
            num_cols = max(len(headers), max((len(r) for r in rows if isinstance(r, list)), default=1), 1)
            col_w = printable_width / num_cols

            matrix_data = []
            if headers:
                padded_headers = (headers + [""] * num_cols)[:num_cols]
                matrix_data.append([Paragraph(f"<b>{_format_rich_text(h)}</b>", table_header_style) for h in padded_headers])

            for r in rows:
                if isinstance(r, list) and any(str(cell).strip() for cell in r):
                    padded_row = (r + [""] * num_cols)[:num_cols]
                    matrix_data.append([Paragraph(_format_rich_text(cell), table_cell_style) for cell in padded_row])

            if matrix_data:
                custom_tbl = Table(matrix_data, colWidths=[col_w] * num_cols)
                tbl_styles = [
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
                if headers:
                    tbl_styles.append(("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")))
                custom_tbl.setStyle(TableStyle(tbl_styles))
                story.append(custom_tbl)
                story.append(Spacer(1, 5))

    # 8. CERTIFICATIONS & ACHIEVEMENTS
    certifications = resume_data.get("certifications") or []
    if isinstance(certifications, list) and len(certifications) > 0:
        valid_certs = [c for c in certifications if isinstance(c, dict) and c.get("name")]
        if valid_certs:
            add_section_divider("Certifications & Achievements")
            for cert in valid_certs:
                c_name = _format_rich_text(cert.get("name"))
                c_issuer = _safe_text(cert.get("issuer") or "")
                c_date = _safe_text(cert.get("date") or "")
                c_url = _sanitize_link(cert.get("url") or "")

                cert_line = f"&bull; <b>{c_name}</b>"
                if c_issuer:
                    cert_line += f" &mdash; {c_issuer}"
                if c_date:
                    cert_line += f" ({c_date})"
                if c_url:
                    cert_line += f' [<a href="{c_url}" color="{accent_hex}"><u>Credential</u></a>]'
                story.append(Paragraph(cert_line, bullet_style))
            story.append(Spacer(1, 3))

    # 9. LANGUAGES
    languages = resume_data.get("languages") or []
    if isinstance(languages, list) and len(languages) > 0:
        valid_langs = [l for l in languages if isinstance(l, dict) and l.get("language")]
        if valid_langs:
            add_section_divider("Languages")
            lang_strings = []
            for l_obj in valid_langs:
                l_name = _safe_text(l_obj.get("language"))
                l_prof = _safe_text(l_obj.get("proficiency") or "Professional")
                lang_strings.append(f"<b>{l_name}</b> ({l_prof})")
            story.append(Paragraph(" &bull; ".join(lang_strings), body_style))

    doc.build(story)
    buffer.seek(0)
    return buffer
