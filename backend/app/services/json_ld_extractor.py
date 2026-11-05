import html
import json
import re
from typing import Any, Dict, List, Optional


def clean_html_description(raw_html: str) -> str:
    """
    Strips HTML markup and unescapes HTML entities from a JobPosting description,
    preserving structural paragraph breaks and bullet points.
    """
    if not raw_html or not isinstance(raw_html, str):
        return ""

    # Unescape HTML entities first in case markup is encoded like &lt;p&gt; or &lt;strong&gt;
    text = html.unescape(raw_html)

    # Replace block break tags with newlines
    text = re.sub(r"<(?:br|hr)\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</(?:p|div|section|article|h[1-6])>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<li[^>]*>", "\n• ", text, flags=re.IGNORECASE)
    text = re.sub(r"</(?:ul|ol)>", "\n", text, flags=re.IGNORECASE)

    # Strip remaining HTML tags
    text = re.sub(r"<[^>]+>", " ", text)

    # Secondary unescape for remaining entities
    text = html.unescape(text)

    # Normalize weird whitespace characters
    text = text.replace("\xa0", " ").replace("\u200b", "")

    # Consolidate consecutive empty lines and excess spacing
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    cleaned = re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()
    return cleaned


def _is_job_posting_type(type_val: Any) -> bool:
    """Checks if a Schema.org @type represents a JobPosting."""
    if isinstance(type_val, str):
        val = type_val.strip().lower()
        return val == "jobposting" or val.endswith(":jobposting") or val.endswith("/jobposting")
    if isinstance(type_val, list):
        return any(_is_job_posting_type(item) for item in type_val)
    return False


def find_job_posting_in_data(data: Any) -> Optional[Dict[str, Any]]:
    """
    Recursively navigates arbitrary JSON-LD data structures to locate a JobPosting object.
    Correctly handles:
      - Direct JobPosting dict
      - Root array of objects
      - Nested "@graph" arrays or objects
      - Arbitrarily nested graphs or child entity nodes
    """
    if not data:
        return None

    # Case 1: Dict object
    if isinstance(data, dict):
        # Check direct @type
        if _is_job_posting_type(data.get("@type")):
            return data

        # Check nested @graph
        if "@graph" in data:
            graph_data = data["@graph"]
            found = find_job_posting_in_data(graph_data)
            if found:
                return found

        # Traverse dict values in case JobPosting is nested under a property (e.g. mainEntity)
        for key, val in data.items():
            if key != "@context" and isinstance(val, (dict, list)):
                found = find_job_posting_in_data(val)
                if found:
                    return found

    # Case 2: List of objects
    elif isinstance(data, list):
        for item in data:
            found = find_job_posting_in_data(item)
            if found:
                return found

    return None


def extract_job_posting_from_json_ld(html_content: str) -> Dict[str, Any]:
    """
    Locates and parses all '<script type="application/ld+json">' tags in the given HTML,
    extracts the Schema.org 'JobPosting' object, and retrieves strictly:
      - 'company_name' (from hiringOrganization.name or string)
      - 'job_role' (from title or name)
      - 'job_description' (from description)

    Handles nested '@graph' objects and JSON parsing errors gracefully.
    Returns a structured dictionary indicating success, or a clear fallback response if unavailable.
    Does NOT invoke any LLM or perform full-webpage HTML scraping.
    """
    if not html_content or not isinstance(html_content, str):
        return {
            "found": False,
            "job_role": None,
            "company_name": None,
            "job_description": None,
            "message": "Empty or invalid HTML content provided. No JobPosting JSON-LD available.",
        }

    # Find all application/ld+json script tags
    script_matches = re.findall(
        r"<script[^>]*type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>",
        html_content,
        flags=re.IGNORECASE | re.DOTALL,
    )

    if not script_matches:
        # Check if this is a LinkedIn public guest job posting HTML
        if "top-card-layout" in html_content or "show-more-less-html__markup" in html_content:
            title_match = re.search(r"top-card-layout__title[^>]*>(.*?)</h2>", html_content, re.DOTALL | re.IGNORECASE)
            job_role = clean_html_description(title_match.group(1)) if title_match else ""

            comp_match = re.search(r"topcard__org-name-link[^>]*>(.*?)</a>", html_content, re.DOTALL | re.IGNORECASE)
            if not comp_match:
                comp_match = re.search(r"topcard__flavor[^>]*>(.*?)</span>", html_content, re.DOTALL | re.IGNORECASE)
            company_name = clean_html_description(comp_match.group(1)) if comp_match else ""

            desc_match = re.search(r"show-more-less-html__markup[^>]*>(.*?)</div>", html_content, re.DOTALL | re.IGNORECASE)
            job_description = clean_html_description(desc_match.group(1)) if desc_match else ""

            if job_role or job_description:
                return {
                    "found": True,
                    "job_role": job_role or "Target Role",
                    "company_name": company_name or None,
                    "job_description": job_description,
                    "message": "Successfully extracted JobPosting via LinkedIn public layout.",
                }

        return {
            "found": False,
            "job_role": None,
            "company_name": None,
            "job_description": None,
            "message": "No '<script type=\"application/ld+json\">' tags found in page. Please paste the job description directly or upload as PDF/TXT.",
        }

    for raw_script in script_matches:
        script_text = raw_script.strip()
        if not script_text:
            continue

        # Strip CDATA and HTML comments if present
        script_text = re.sub(r"^\s*<!(?:\[CDATA\[|--)", "", script_text)
        script_text = re.sub(r"(?:\]\]|--)>\s*$", "", script_text).strip()

        # Parse JSON safely handling malformed JSON / trailing characters
        try:
            parsed_data = json.loads(script_text)
        except (json.JSONDecodeError, ValueError):
            # Attempt to strip trailing commas before closing braces/brackets if common error
            try:
                sanitized_text = re.sub(r",\s*([\]}])", r"\1", script_text)
                parsed_data = json.loads(sanitized_text)
            except Exception:
                continue

        # Search for Schema.org JobPosting object
        job_node = find_job_posting_in_data(parsed_data)
        if not job_node or not isinstance(job_node, dict):
            continue

        # 1. Extract job_role (from title, jobTitle, or name)
        job_role = ""
        for title_key in ("title", "jobTitle", "name"):
            val = job_node.get(title_key)
            if val and isinstance(val, str) and val.strip():
                job_role = val.strip()
                break

        # 2. Extract company_name (from hiringOrganization.name or legalName, or direct string)
        company_name = ""
        org = job_node.get("hiringOrganization")
        if isinstance(org, dict):
            for org_key in ("name", "legalName", "alternateName"):
                name_val = org.get(org_key)
                if name_val and isinstance(name_val, str) and name_val.strip():
                    company_name = name_val.strip()
                    break
        elif isinstance(org, str) and org.strip():
            company_name = org.strip()

        # 3. Extract job_description (from description)
        raw_desc = job_node.get("description") or ""
        job_description = clean_html_description(str(raw_desc)) if raw_desc else ""

        # Validate that we retrieved meaningful job data
        if job_role or job_description:
            return {
                "found": True,
                "job_role": job_role or "Target Role",
                "company_name": company_name or None,
                "job_description": job_description,
                "message": "Successfully extracted JobPosting via Schema.org JSON-LD.",
            }

    # Clear fallback response when JobPosting data is unavailable
    return {
        "found": False,
        "job_role": None,
        "company_name": None,
        "job_description": None,
        "message": (
            "Schema.org 'JobPosting' JSON-LD is unavailable on this page. "
            "Please paste the job description text directly or upload it as a PDF/TXT file."
        ),
    }

