import re
from pathlib import Path
import fitz  # PyMuPDF
import docx

def clean_extracted_text(text: str) -> str:
    """
    Cleans raw extracted text:
    - Normalizes Unicode bullets
    - Removes non-printable control characters
    - Unwraps hyphenated line breaks (e.g. 'imple- \n mentation' -> 'implementation')
    - Collapses multiple blank lines into consistent paragraphs
    """
    if not text:
        return ""
    
    # Normalize bullet characters
    text = re.sub(r"[\u2022\u2023\u25E6\u2043\u2219\uF0B7\u25AA\u25CF]", "\n• ", text)
    
    # Unwrap hyphenated line-endings
    text = re.sub(r"(\w+)-\s*\n\s*(\w+)", r"\1\2", text)
    
    # Replace non-breaking spaces and tabs
    text = text.replace("\xa0", " ").replace("\t", " ")
    
    # Normalize multiple spaces per line
    lines = [re.sub(r" +", " ", line).strip() for line in text.split("\n")]
    
    # Remove consecutive empty lines
    cleaned_lines = []
    prev_empty = False
    for line in lines:
        if not line:
            if not prev_empty:
                cleaned_lines.append("")
                prev_empty = True
        else:
            cleaned_lines.append(line)
            prev_empty = False
            
    return "\n".join(cleaned_lines).strip()

def extract_text_from_pdf(file_path: str) -> str:
    """
    Extracts text from a PDF file using PyMuPDF (fitz) with layout-aware block sorting.
    """
    doc = fitz.open(file_path)
    full_text_blocks = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        # Sort blocks top-to-bottom, left-to-right
        blocks = page.get_text("blocks", sort=True)
        for b in blocks:
            # block tuple: (x0, y0, x1, y1, text, block_no, block_type)
            # block_type 0 means text
            if b[6] == 0:
                block_text = b[4].strip()
                if block_text:
                    full_text_blocks.append(block_text)
                    
    doc.close()
    raw_combined = "\n\n".join(full_text_blocks)
    return clean_extracted_text(raw_combined)

def extract_text_from_docx(file_path: str) -> str:
    """
    Extracts text from a DOCX file using python-docx.
    """
    doc = docx.Document(file_path)
    paragraphs = []
    for p in doc.paragraphs:
        if p.text.strip():
            paragraphs.append(p.text.strip())
            
    # Also extract text from tables
    for table in doc.tables:
        for row in table.rows:
            row_texts = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_texts:
                paragraphs.append(" | ".join(row_texts))
                
    raw_combined = "\n\n".join(paragraphs)
    return clean_extracted_text(raw_combined)

def extract_text_from_file(file_path: str) -> str:
    """
    Dispatcher based on file extension.
    """
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext in [".docx", ".doc"]:
        return extract_text_from_docx(file_path)
    elif ext == ".txt":
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return clean_extracted_text(f.read())
    else:
        raise ValueError(f"Unsupported file type: {ext}")
