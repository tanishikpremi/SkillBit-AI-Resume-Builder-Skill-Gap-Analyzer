import io
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, KeepTogether

def build_ats_resume_pdf(resume_data: Dict[str, Any]) -> io.BytesIO:
    """
    Generates a single-column, machine-readable ATS-compliant PDF resume using ReportLab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,   # 0.5 inch margins
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom ATS-friendly styles
    name_style = ParagraphStyle(
        "ATSName",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        alignment=1,  # Center
        textColor=colors.HexColor("#1A202C")
    )
    
    contact_style = ParagraphStyle(
        "ATSContact",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        alignment=1,  # Center
        textColor=colors.HexColor("#4A5568")
    )
    
    section_heading_style = ParagraphStyle(
        "ATSSectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#2B6CB0"),
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        "ATSBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#2D3748")
    )

    item_title_style = ParagraphStyle(
        "ATSItemTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#1A202C")
    )
    
    item_sub_style = ParagraphStyle(
        "ATSItemSub",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4A5568")
    )
    
    bullet_style = ParagraphStyle(
        "ATSBullet",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        leftIndent=15,
        firstLineIndent=-10,
        textColor=colors.HexColor("#2D3748")
    )

    story = []

    # 1. Header (Name & Contact Info)
    contact = resume_data.get("contact_info", {})
    name = contact.get("full_name") or resume_data.get("full_name") or resume_data.get("title", "Candidate Name")
    story.append(Paragraph(name, name_style))
    story.append(Spacer(1, 3))

    contact_parts = []
    if contact.get("email"): contact_parts.append(contact["email"])
    if contact.get("phone"): contact_parts.append(contact["phone"])
    if contact.get("location"): contact_parts.append(contact["location"])
    if contact.get("linkedin"): contact_parts.append(contact["linkedin"])
    if contact.get("github"): contact_parts.append(contact["github"])

    if contact_parts:
        story.append(Paragraph(" • ".join(contact_parts), contact_style))
        story.append(Spacer(1, 8))

    def add_section_divider(title: str):
        story.append(Paragraph(title.upper(), section_heading_style))
        story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#CBD5E0"), spaceAfter=5))

    # 2. Professional Summary
    summary = resume_data.get("summary")
    if summary:
        add_section_divider("Professional Summary")
        story.append(Paragraph(summary, body_style))
        story.append(Spacer(1, 6))

    # 3. Technical Skills
    skills_raw = resume_data.get("skills") or resume_data.get("skills_raw") or resume_data.get("extracted_skills", [])
    if skills_raw:
        add_section_divider("Technical Skills")
        if isinstance(skills_raw, list):
            if skills_raw and isinstance(skills_raw[0], dict):
                skill_names = [s.get("canonical_name", s.get("name", "")) for s in skills_raw if s.get("canonical_name") or s.get("name")]
                skills_text = ", ".join(skill_names)
            else:
                skills_text = ", ".join(str(s) for s in skills_raw)
        else:
            skills_text = str(skills_raw)
        story.append(Paragraph(f"<b>Core Technologies:</b> {skills_text}", body_style))
        story.append(Spacer(1, 6))

    # 4. Experience
    experiences = resume_data.get("experiences") or resume_data.get("experience", [])
    if experiences and isinstance(experiences, list):
        add_section_divider("Work Experience")
        for exp in experiences:
            company = exp.get("company", "Company")
            role = exp.get("role_title") or exp.get("role", "Role")
            dates = f"{exp.get('start_date', '')} - {'Present' if exp.get('is_current') else exp.get('end_date', '')}".strip(" -")
            location = exp.get("location", "")
            
            sub_line = f"{role} | {company}"
            if dates: sub_line += f" ({dates})"
            if location: sub_line += f" — {location}"

            story.append(Paragraph(sub_line, item_title_style))
            
            bullets = exp.get("bullets", [])
            for b in bullets:
                story.append(Paragraph(f"• {b}", bullet_style))
            story.append(Spacer(1, 5))
    elif resume_data.get("experience_raw"):
        add_section_divider("Work Experience")
        for line in resume_data["experience_raw"].split("\n"):
            if line.strip():
                story.append(Paragraph(line.strip(), body_style))
        story.append(Spacer(1, 6))

    # 5. Projects
    projects = resume_data.get("projects", [])
    if projects and isinstance(projects, list):
        add_section_divider("Projects")
        for proj in projects:
            title = proj.get("title", "Project")
            techs = ", ".join(proj.get("technologies", []))
            title_line = f"<b>{title}</b>"
            if techs: title_line += f" | <i>{techs}</i>"
            story.append(Paragraph(title_line, item_title_style))
            if proj.get("description"):
                story.append(Paragraph(proj["description"], body_style))
            story.append(Spacer(1, 4))
    elif resume_data.get("projects_raw"):
        add_section_divider("Projects")
        for line in resume_data["projects_raw"].split("\n"):
            if line.strip():
                story.append(Paragraph(line.strip(), body_style))
        story.append(Spacer(1, 6))

    # 6. Education
    educations = resume_data.get("educations") or resume_data.get("education", [])
    if educations and isinstance(educations, list):
        add_section_divider("Education")
        for edu in educations:
            deg = edu.get("degree", "Degree")
            field = edu.get("field_of_study", "")
            inst = edu.get("institution", "Institution")
            dates = f"{edu.get('start_date', '')} - {edu.get('end_date', '')}".strip(" -")
            
            edu_line = f"<b>{deg}{(' in ' + field) if field else ''}</b> | {inst}"
            if dates: edu_line += f" ({dates})"
            story.append(Paragraph(edu_line, item_title_style))
            if edu.get("gpa"):
                story.append(Paragraph(f"GPA: {edu['gpa']}", item_sub_style))
            story.append(Spacer(1, 4))
    elif resume_data.get("education_raw"):
        add_section_divider("Education")
        for line in resume_data["education_raw"].split("\n"):
            if line.strip():
                story.append(Paragraph(line.strip(), body_style))
        story.append(Spacer(1, 6))

    # Build PDF document
    doc.build(story)
    buffer.seek(0)
    return buffer
