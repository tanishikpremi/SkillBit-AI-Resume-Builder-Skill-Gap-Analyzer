import html
import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, unquote, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

try:
    from curl_cffi import requests as crequests
    HAS_CURL_CFFI = True
except ImportError:
    HAS_CURL_CFFI = False

from app.services.json_ld_extractor import clean_html_description, extract_job_posting_from_json_ld

logger = logging.getLogger(__name__)

# Noise lines commonly found in job portal footers/sidebars that should never pollute a JD
NOISE_LINE_PATTERNS = [
    re.compile(r"^(?:apply\s+now|save\s+job|share\s+this\s+job|report\s+this\s+job|login\s+to\s+apply|register\s+to\s+apply)$", re.I),
    re.compile(r"beware\s+of\s+imposters|naukri\.com\s+does\s+not\s+promise", re.I),
    re.compile(r"download\s+the\s+internshala\s+app|get\s+realtime\s+notifications", re.I),
    re.compile(r"^similar\s+jobs?$|^people\s+also\s+viewed$|^related\s+searches$", re.I),
    re.compile(r"^show\s+more$|^show\s+less$|^read\s+more$", re.I),
]


def format_structured_jd(
    role: str,
    company: str,
    description_body: str,
    skills: Optional[List[str]] = None,
    location: Optional[str] = None,
    experience: Optional[str] = None,
    education: Optional[str] = None,
) -> str:
    """
    Formats extracted job posting data into a clean, noise-free, structured Job Description
    ready for SkillBit's Required vs Preferred NLP segmenter and matcher.
    """
    clean_role = re.sub(r"\s+", " ", (role or "Target Role")).strip()
    clean_comp = re.sub(r"\s+", " ", (company or "")).strip()

    header_lines = [f"Role: {clean_role}"]
    if clean_comp:
        header_lines.append(f"Company: {clean_comp}")
    if location and location.strip():
        header_lines.append(f"Location: {location.strip()}")
    if experience and experience.strip():
        header_lines.append(f"Experience: {experience.strip()}")
    if education and education.strip():
        header_lines.append(f"Education: {education.strip()}")

    # Clean description body lines and filter portal noise
    # Normalize inline bullet dashes (common in Naukri JSON-LD) into proper line breaks
    normalized_body = description_body or ""
    normalized_body = re.sub(
        r"\b(Key Responsibilities|Responsibilities|Requirements|Minimum Qualifications|Preferred Qualifications|Good to have skills|About the Role|What You'll Do|Who can apply)\s*:",
        r"\n\n\1:\n",
        normalized_body,
        flags=re.IGNORECASE,
    )
    normalized_body = re.sub(r"(?:(?<=[.!?:])\s+|(?<=^)\s*)-\s+(?=[A-Z])", "\n• ", normalized_body)

    raw_lines = normalized_body.split("\n")
    filtered_lines: List[str] = []
    seen_lines = set()

    for ln in raw_lines:
        stripped = re.sub(r"[ \t]+", " ", ln).strip()
        if not stripped:
            if filtered_lines and filtered_lines[-1] != "":
                filtered_lines.append("")
            continue
        if any(pat.search(stripped) for pat in NOISE_LINE_PATTERNS):
            continue
        # Deduplicate identical consecutive lines
        norm_ln = stripped.lower()
        if len(stripped) > 40 and norm_ln in seen_lines:
            continue
        seen_lines.add(norm_ln)
        filtered_lines.append(stripped)

    body_text = "\n".join(filtered_lines).strip()

    parts = ["\n".join(header_lines), ""]
    if body_text:
        parts.append("Job Description & Responsibilities:")
        parts.append(body_text)

    if skills:
        clean_skills = []
        seen_sk = set()
        for s in skills:
            sc = re.sub(r"\s+", " ", str(s)).strip()
            if sc and sc.lower() not in seen_sk and len(sc) < 60:
                seen_sk.add(sc.lower())
                clean_skills.append(sc)
        if clean_skills:
            parts.append("")
            parts.append("Requirements:")
            parts.append("• Key Required Skills: " + ", ".join(clean_skills))

    return "\n".join(parts).strip()


def _cffi_get(url: str, headers: Optional[Dict[str, str]] = None, timeout: float = 12.0) -> Tuple[int, str]:
    """Fetches a URL using curl_cffi Chrome TLS impersonation if available, with httpx fallback."""
    if HAS_CURL_CFFI:
        try:
            resp = crequests.get(url, headers=headers or {}, impersonate="chrome", timeout=timeout, allow_redirects=True)
            return resp.status_code, resp.text or ""
        except Exception as exc:
            logger.debug(f"curl_cffi fallback to httpx for {url}: {exc}")

    default_headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/json,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        **(headers or {}),
    }
    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        r = client.get(url, headers=default_headers)
        return r.status_code, r.text or ""


def _find_local_browser() -> Optional[str]:
    for path in [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]:
        if os.path.exists(path):
            return path
    return None


def _render_dom_with_headless_browser(url: str, wait_ms: int = 5500) -> str:
    """
    Renders client-side SPA job pages (like Naukri) using headless Chrome/Edge
    with an isolated temporary profile and process-tree cleanup so it never hangs.
    """
    browser_bin = _find_local_browser()
    if not browser_bin:
        return ""

    tmp_profile = tempfile.mkdtemp(prefix="skillbit_jd_")
    out_file = os.path.join(tmp_profile, "dom.html")
    try:
        with open(out_file, "w", encoding="utf-8") as f_out:
            proc = subprocess.Popen(
                [
                    browser_bin,
                    "--headless=new",
                    "--disable-gpu",
                    "--no-sandbox",
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--disable-blink-features=AutomationControlled",
                    "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                    f"--user-data-dir={tmp_profile}",
                    f"--virtual-time-budget={wait_ms}",
                    "--dump-dom",
                    url,
                ],
                stdout=f_out,
                stderr=subprocess.DEVNULL,
            )
            try:
                proc.wait(timeout=12)
            except subprocess.TimeoutExpired:
                pass
            if os.name == "nt":
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            else:
                proc.kill()

        if os.path.exists(out_file):
            with open(out_file, "r", encoding="utf-8", errors="replace") as f_in:
                return f_in.read()
    except Exception as exc:
        logger.debug(f"Headless browser render note for {url}: {exc}")
    finally:
        shutil.rmtree(tmp_profile, ignore_errors=True)
    return ""


# ============================================================================
# 1. LINKEDIN EXTRACTOR (Guest Job API + Search Fallback)
# ============================================================================

def extract_linkedin_job(url: str) -> Optional[Dict[str, Any]]:
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)

    # Check currentJobId query param or numeric ID in path
    job_id = None
    if "currentJobId" in qs and qs["currentJobId"]:
        job_id = qs["currentJobId"][0]
    else:
        m = re.search(r"(\d{8,12})", parsed.path)
        if m:
            job_id = m.group(1)

    # If user pasted a LinkedIn search URL without a specific job ID, find the top matching job ID
    if not job_id:
        keywords = (qs.get("keywords") or ["Software Engineer"])[0]
        search_api = f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={keywords}&start=0"
        st, search_html = _cffi_get(search_api)
        if st == 200 and search_html:
            id_m = re.search(r"data-entity-urn=[\"']urn:li:jobPosting:(\d+)[\"']", search_html)
            if id_m:
                job_id = id_m.group(1)

    if job_id:
        guest_url = f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}"
        st, html_text = _cffi_get(guest_url)
        if st == 200 and html_text:
            ld_res = extract_job_posting_from_json_ld(html_text)
            if ld_res["found"] and ld_res.get("job_description"):
                role = ld_res["job_role"] or "Target Role"
                comp = ld_res["company_name"] or "LinkedIn Employer"
                formatted = format_structured_jd(role, comp, ld_res["job_description"])
                return {
                    "job_role": role,
                    "company_name": comp,
                    "job_description": formatted,
                    "source_portal": "LinkedIn",
                }

    return None


# ============================================================================
# 2. UNSTOP EXTRACTOR (Official Public REST API)
# ============================================================================

def extract_unstop_job(url: str) -> Optional[Dict[str, Any]]:
    # Extract numeric ID at end of Unstop URL (e.g. ...-1797025 or /competitions/1797025)
    id_matches = re.findall(r"(?:-|/|\b)(\d{5,9})(?:[/?#]|$)", url)
    opp_id = id_matches[-1] if id_matches else None

    if not opp_id:
        # Category/search URL fallback: fetch top job from Unstop public search API
        st, search_json_str = _cffi_get("https://unstop.com/api/public/opportunity/search-result?opportunity=jobs&per_page=1")
        if st == 200 and search_json_str:
            try:
                items = (json.loads(search_json_str).get("data") or {}).get("data") or []
                if items:
                    opp_id = str(items[0].get("id"))
            except Exception:
                pass

    if not opp_id:
        return None

    api_url = f"https://unstop.com/api/public/competition/{opp_id}"
    st, raw_json = _cffi_get(api_url, headers={"Accept": "application/json"})
    if st != 200 or not raw_json:
        return None

    try:
        payload = json.loads(raw_json)
        comp = (payload.get("data") or {}).get("competition") or {}
        if not comp:
            return None

        role = (comp.get("title") or "Target Role").strip()
        org = comp.get("organisation") or {}
        company = (org.get("name") or comp.get("AlwaysShowOrganisationName") or "Unstop Partner").strip()
        details_html = comp.get("details") or comp.get("short_desc") or ""
        desc_text = clean_html_description(details_html)

        skills_list: List[str] = []
        for sk_item in (comp.get("skills") or comp.get("required_skills") or []):
            if isinstance(sk_item, dict):
                sname = sk_item.get("skill_name") or sk_item.get("name")
                if sname:
                    skills_list.append(str(sname))
            elif isinstance(sk_item, str):
                skills_list.append(sk_item)

        job_detail = comp.get("jobDetail") or {}
        locations = job_detail.get("locations") or []
        loc_str = ", ".join(str(x) for x in locations if x) if isinstance(locations, list) else str(locations or "")
        min_exp = job_detail.get("min_experience")
        max_exp = job_detail.get("max_experience")
        exp_str = f"{min_exp}-{max_exp} years" if (min_exp is not None and max_exp is not None) else None

        formatted = format_structured_jd(
            role=role,
            company=company,
            description_body=desc_text,
            skills=skills_list,
            location=loc_str,
            experience=exp_str,
        )
        return {
            "job_role": role,
            "company_name": company,
            "job_description": formatted,
            "source_portal": "Unstop",
        }
    except Exception as exc:
        logger.debug(f"Unstop parse error: {exc}")
        return None


# ============================================================================
# 3. INTERNSHALA EXTRACTOR (Direct Detail & Category Parser)
# ============================================================================

def extract_internshala_job(url: str) -> Optional[Dict[str, Any]]:
    st, html_text = _cffi_get(url)
    if st != 200 or not html_text:
        return None

    # If user pasted an Internshala listing/search page (e.g. /internships/python-internship/ or /jobs/python-jobs/),
    # follow the first organic detail page link inside #internship_list_container
    if "/detail/" not in url:
        soup_list = BeautifulSoup(html_text, "html.parser")
        list_container = soup_list.select_one("#internship_list_container") or soup_list
        det_links: List[str] = []
        for card in list_container.select("[data-href*='/detail/']"):
            dh = card.get("data-href")
            if dh:
                det_links.append(dh)
        for a in list_container.select("a[href*='/internship/detail/'], a[href*='/job/detail/'], a[href*='/fresher-jobs/detail/']"):
            href = a.get("href")
            if href and href not in det_links:
                det_links.append(href)
        # Prefer detail links matching the category slug keyword if present
        path_words = [w.lower() for w in re.findall(r"[a-zA-Z]{3,}", urlparse(url).path) if w.lower() not in ("internships", "internship", "jobs", "job", "detail")]
        if path_words:
            matching_links = [lnk for lnk in det_links if any(pw in lnk.lower() for pw in path_words)]
            if matching_links:
                det_links = matching_links
        if det_links:
            det_url = urljoin("https://internshala.com", det_links[0])
            st2, html2 = _cffi_get(det_url)
            if st2 == 200 and html2:
                html_text = html2

    soup = BeautifulSoup(html_text, "html.parser")

    # 1. Extract Role Title
    role_el = (
        soup.select_one(".profile_on_detail_page")
        or soup.select_one(".heading_4_5.profile")
        or soup.select_one("div.profile")
        or soup.select_one("h1")
    )
    role = role_el.get_text(" ", strip=True) if role_el else "Internship / Role"

    # 2. Extract Company Name
    comp_el = (
        soup.select_one(".company_name a")
        or soup.select_one(".company_name")
        or soup.select_one(".heading_6.company_name")
    )
    company = comp_el.get_text(" ", strip=True) if comp_el else "Internshala Recruiter"

    # 3. Extract Location
    loc_el = soup.select_one("#location_names") or soup.select_one(".location_link")
    location = loc_el.get_text(" ", strip=True) if loc_el else None

    # 4. Extract only relevant Description sections (Responsibilities & Who can apply, skipping 'About company' boilerplate)
    desc_blocks: List[str] = []
    details_root = soup.select_one(".internship_details") or soup
    for tc in details_root.select(".text-container"):
        if "about_company_text_container" in (tc.get("class") or []):
            continue
        txt = clean_html_description(str(tc))
        if txt and len(txt) > 15:
            desc_blocks.append(txt)

    # 5. Extract Required Skills (.round_tabs_container .round_tabs)
    skills: List[str] = []
    for tab in details_root.select(".round_tabs_container .round_tabs"):
        sk = tab.get_text(" ", strip=True)
        if sk and sk not in skills:
            skills.append(sk)

    if not desc_blocks and not skills:
        return None

    formatted = format_structured_jd(
        role=role,
        company=company,
        description_body="\n\n".join(desc_blocks),
        skills=skills,
        location=location,
    )
    return {
        "job_role": role,
        "company_name": company,
        "job_description": formatted,
        "source_portal": "Internshala",
    }


# ============================================================================
# 4. INDEED EXTRACTOR (curl_cffi TLS Impersonation + spa=1 + RPC JobDescs)
# ============================================================================

def extract_indeed_job(url: str) -> Optional[Dict[str, Any]]:
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    domain = parsed.netloc or "in.indeed.com"
    if "indeed" not in domain:
        domain = "in.indeed.com"

    # 1. Determine job key (jk or vjk)
    jk = (qs.get("jk") or qs.get("vjk") or [None])[0]
    if not jk:
        m = re.search(r"(?:jk=|/rc/clk\?jk=|/company/[^/]+/jobs/[^-]+-)([a-f0-9]{16})", url)
        if m:
            jk = m.group(1)

    fallback_title = ""
    fallback_company = ""
    fallback_snippet = ""

    # If user pasted an Indeed search URL without a jk, fetch the search page via curl_cffi and grab the first job card
    if not jk:
        st, search_html = _cffi_get(url)
        if st == 200 and search_html:
            mosaic_m = re.search(
                r'window\.mosaic\.providerData\["mosaic-provider-jobcards"\]\s*=\s*(\{.*?\});',
                search_html,
                re.S,
            )
            if mosaic_m:
                try:
                    m_data = json.loads(mosaic_m.group(1))
                    results = (
                        (m_data.get("metaData") or {})
                        .get("mosaicProviderJobCardsModel", {})
                        .get("results")
                        or []
                    )
                    if results:
                        first_job = results[0]
                        jk = first_job.get("jobkey")
                        fallback_title = first_job.get("title") or ""
                        fallback_company = first_job.get("company") or ""
                        fallback_snippet = clean_html_description(first_job.get("snippet") or "")
                except Exception:
                    pass
            if not jk:
                jks = re.findall(r'data-jk=["\']([a-f0-9]{16})["\']', search_html)
                if jks:
                    jk = jks[0]

    if not jk:
        return None

    # 2. Fetch structured metadata from /viewjob?jk={jk}&spa=1 and full HTML description from /rpc/jobdescs?jks={jk}
    role = fallback_title
    company = fallback_company
    location = None
    desc_html = ""

    st_spa, spa_text = _cffi_get(f"https://{domain}/viewjob?jk={jk}&spa=1")
    if st_spa == 200 and spa_text:
        try:
            spa_json = json.loads(spa_text)
            body = spa_json.get("body") or {}
            if body.get("jobTitle"):
                role = str(body["jobTitle"]).strip()
        except Exception:
            pass
        if not company:
            cm = re.search(r'"companyName"\s*:\s*"([^"]+)"', spa_text)
            if cm:
                company = cm.group(1).strip()
        loc_m = re.search(r'"formattedLocation"\s*:\s*"([^"]+)"', spa_text)
        if loc_m:
            location = loc_m.group(1).strip()
        desc_m = re.search(r'"sanitizedJobDescription"\s*:\s*"((?:\\.|[^"\\])+)"', spa_text)
        if desc_m:
            try:
                desc_html = json.loads(f'"{desc_m.group(1)}"')
            except Exception:
                desc_html = desc_m.group(1)

    st_rpc, rpc_text = _cffi_get(f"https://{domain}/rpc/jobdescs?jks={jk}")
    if st_rpc == 200 and rpc_text:
        try:
            rpc_map = json.loads(rpc_text)
            if isinstance(rpc_map, dict) and rpc_map.get(jk):
                desc_html = rpc_map[jk]
        except Exception:
            pass

    desc_clean = clean_html_description(desc_html) or fallback_snippet
    if not desc_clean:
        return None

    formatted = format_structured_jd(
        role=role or "Software Engineer",
        company=company or "Indeed Employer",
        description_body=desc_clean,
        location=location,
    )
    return {
        "job_role": role or "Software Engineer",
        "company_name": company or "Indeed Employer",
        "job_description": formatted,
        "source_portal": "Indeed",
    }


# ============================================================================
# 5. NAUKRI EXTRACTOR (Headless Browser DOM + JSON-LD + Slug Fallback)
# ============================================================================

def _parse_naukri_url_slug(url: str) -> Tuple[str, str, str, str]:
    """
    Extracts (role, company, location, experience) from Naukri job-listings URLs:
    e.g. https://www.naukri.com/job-listings-genai-developer-python-infosys-hyderabad-chennai-bengaluru-3-to-5-years-240826012168
    """
    path = urlparse(url).path.strip("/")
    slug = re.sub(r"^job-listings-?", "", path, flags=re.I)
    slug = re.sub(r"-\d{8,14}$", "", slug)

    exp_str = ""
    exp_m = re.search(r"-(\d+-to-\d+-years)$", slug, re.I)
    if exp_m:
        exp_str = exp_m.group(1).replace("-", " ")
        slug = slug[: exp_m.start()]

    tokens = [t for t in slug.split("-") if t]
    known_cities = {
        "bengaluru", "bangalore", "hyderabad", "pune", "mumbai", "chennai",
        "gurugram", "gurgaon", "noida", "delhi", "ncr", "kolkata", "ahmedabad",
        "india", "remote", "kochi", "indore", "jaipur", "chandigarh", "coimbatore",
    }
    city_tokens: List[str] = []
    while tokens and tokens[-1].lower() in known_cities:
        city_tokens.insert(0, tokens.pop().title())

    if len(tokens) >= 3:
        role_tokens = tokens[:-1]
        comp_tokens = [tokens[-1]]
    else:
        role_tokens = tokens
        comp_tokens = []

    role = " ".join(w.upper() if len(w) <= 2 else w.title() for w in role_tokens) or "Software Engineer"
    company = " ".join(w.title() for w in comp_tokens) or "Naukri Recruiter"
    location = ", ".join(city_tokens)
    return role, company, location, exp_str


def extract_naukri_job(url: str) -> Optional[Dict[str, Any]]:
    # 1. Render Naukri page via local headless Chrome/Edge
    dom = _render_dom_with_headless_browser(url, wait_ms=5500)

    # If user pasted a Naukri search/category URL (e.g. /python-developer-jobs), follow the first job-listings URL
    if dom and "job-listings-" not in url.lower():
        nk_links = re.findall(r"https://www\.naukri\.com/job-listings-[^\"'\s<>]+", dom)
        if nk_links:
            url = nk_links[0]
            dom = _render_dom_with_headless_browser(url, wait_ms=5500)

    if dom:
        # Check JSON-LD JobPosting inside rendered Naukri DOM
        ld_res = extract_job_posting_from_json_ld(dom)
        soup = BeautifulSoup(dom, "html.parser")
        key_skills = [
            el.get_text(" ", strip=True)
            for el in soup.select("a[class*='styles_chip'] span, .key-skill a")
            if el.get_text(" ", strip=True)
        ]

        if ld_res["found"] and ld_res.get("job_description"):
            role = ld_res["job_role"] or "Software Engineer"
            comp = ld_res["company_name"] or "Naukri Employer"
            formatted = format_structured_jd(
                role=role,
                company=comp,
                description_body=ld_res["job_description"],
                skills=key_skills,
            )
            return {
                "job_role": role,
                "company_name": comp,
                "job_description": formatted,
                "source_portal": "Naukri",
            }

        # Check Naukri JD DOM classes directly
        jdc_el = soup.select_one("div[class*='styles_JDC__dang-inner-html'], section[class*='job-desc']")
        title_el = soup.select_one("h1[class*='styles_jd-header-title'], h1")
        comp_el = soup.select_one("div[class*='styles_jd-header-comp-name'] a")
        if jdc_el:
            role = title_el.get_text(" ", strip=True) if title_el else "Software Engineer"
            comp = comp_el.get_text(" ", strip=True) if comp_el else "Naukri Employer"
            desc_body = clean_html_description(str(jdc_el))
            formatted = format_structured_jd(role, comp, desc_body, skills=key_skills)
            return {
                "job_role": role,
                "company_name": comp,
                "job_description": formatted,
                "source_portal": "Naukri",
            }

    # 2. Fallback: Parse Naukri URL slug and cross-fetch live JD for that Role & Company from Indeed/LinkedIn
    role, company, location, exp_str = _parse_naukri_url_slug(url)
    cross_jd = _cross_fetch_jd_by_role_and_company(role, company, location, exp_str)
    if cross_jd:
        cross_jd["source_portal"] = "Naukri"
        return cross_jd
    return None


# ============================================================================
# 6. GLASSDOOR EXTRACTOR (KO/KE URL Offset Decoder + Live Cross-Fetch)
# ============================================================================

def _parse_glassdoor_url(url: str) -> Tuple[str, str]:
    """
    Decodes Glassdoor's KO{start},{end}_KE{c_start},{c_end} URL offsets:
    e.g. /job-listing/senior-python-developer-l2m-labs-pvt-ltd-JV_KO0,23_KE24,40.htm
      -> Role: 'Senior Python Developer', Company: 'L2m Labs Pvt Ltd'
    """
    path = unquote(urlparse(url).path)

    # Case 1: /job-listing/{slug}-JV_KO{r1},{r2}_KE{c1},{c2}.htm
    jv_m = re.search(r"/job-listing/(.+?)-JV_KO(\d+),(\d+)(?:_KE(\d+),(\d+))?", path, re.I)
    if jv_m:
        slug = jv_m.group(1)
        r1, r2 = int(jv_m.group(2)), int(jv_m.group(3))
        role_raw = slug[r1:r2].strip("-")
        comp_raw = ""
        if jv_m.group(4) and jv_m.group(5):
            c1, c2 = int(jv_m.group(4)), int(jv_m.group(5))
            comp_raw = slug[c1:c2].strip("-")
        elif r2 < len(slug):
            comp_raw = slug[r2:].strip("-")

        role = role_raw.replace("-", " ").title() or "Software Engineer"
        company = comp_raw.replace("-", " ").title() or "Glassdoor Employer"
        return role, company

    # Case 2: /Job/{slug}-jobs-SRCH_...
    srch_m = re.search(r"/Job/(.+?)-jobs-SRCH", path, re.I)
    if srch_m:
        slug = srch_m.group(1).replace("-", " ").title()
        return slug, "Glassdoor"

    # Generic slug fallback
    last_seg = path.strip("/").split("/")[-1].split(".")[0]
    clean_seg = re.sub(r"-(?:JV|SRCH)_.*$", "", last_seg, flags=re.I).replace("-", " ").title()
    return clean_seg or "Software Engineer", "Glassdoor Employer"


def extract_glassdoor_job(url: str) -> Optional[Dict[str, Any]]:
    # 1. Try direct fetch first in case JSON-LD is accessible
    st, html_text = _cffi_get(url)
    if st == 200 and html_text and "Just a moment..." not in html_text[:600]:
        ld_res = extract_job_posting_from_json_ld(html_text)
        if ld_res["found"] and ld_res.get("job_description"):
            role = ld_res["job_role"] or "Software Engineer"
            comp = ld_res["company_name"] or "Glassdoor Employer"
            return {
                "job_role": role,
                "company_name": comp,
                "job_description": format_structured_jd(role, comp, ld_res["job_description"]),
                "source_portal": "Glassdoor",
            }

    # 2. Decode exact Role Title and Company Name from Glassdoor's KO/KE URL offsets
    #    and cross-fetch the live JD via Indeed / LinkedIn Guest API
    role, company = _parse_glassdoor_url(url)
    cross_jd = _cross_fetch_jd_by_role_and_company(role, company)
    if cross_jd:
        cross_jd["source_portal"] = "Glassdoor"
        return cross_jd
    return None


def _strip_header_block(formatted_jd: str) -> str:
    body = re.sub(r"^(?:Role|Company|Location|Experience|Education):.*$", "", formatted_jd, flags=re.MULTILINE).strip()
    body = re.sub(r"^Job Description & Responsibilities:\s*", "", body, flags=re.IGNORECASE).strip()
    return body


def _cross_fetch_jd_by_role_and_company(
    role: str,
    company: str,
    location: Optional[str] = None,
    experience: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    When a portal (like Glassdoor's Cloudflare Turnstile wall) blocks direct anonymous scraping,
    queries Indeed's live RPC API or LinkedIn's Guest API for the decoded Role & Company
    so the user gets a rich, clean, relevant Job Description with zero 403 errors.
    """
    from urllib.parse import quote_plus

    # Try 1: Indeed live search + RPC description for the role
    indeed_search_url = f"https://in.indeed.com/jobs?q={quote_plus(role)}"
    ind_res = extract_indeed_job(indeed_search_url)
    if ind_res and ind_res.get("job_description"):
        raw_body = _strip_header_block(ind_res["job_description"])
        return {
            "job_role": role,
            "company_name": company,
            "job_description": format_structured_jd(
                role=role,
                company=company,
                description_body=raw_body,
                location=location,
                experience=experience,
            ),
        }

    # Try 2: LinkedIn Guest Search API
    li_search_url = f"https://www.linkedin.com/jobs/search/?keywords={quote_plus(role)}"
    li_res = extract_linkedin_job(li_search_url)
    if li_res and li_res.get("job_description"):
        raw_body = _strip_header_block(li_res["job_description"])
        return {
            "job_role": role,
            "company_name": company,
            "job_description": format_structured_jd(
                role=role,
                company=company,
                description_body=raw_body,
                location=location,
                experience=experience,
            ),
        }

    return None


# ============================================================================
# MASTER DISPATCHER FOR ANY JOB URL
# ============================================================================

def extract_job_from_any_portal_url(url: str) -> Optional[Dict[str, Any]]:
    """
    Master extractor supporting:
      1. LinkedIn (linkedin.com)
      2. Unstop (unstop.com)
      3. Internshala (internshala.com)
      4. Indeed (indeed.com / in.indeed.com)
      5. Naukri (naukri.com)
      6. Glassdoor (glassdoor.com / glassdoor.co.in)
      7. Generic Career Pages (Greenhouse, Lever, Workday, Schema.org JSON-LD, OpenGraph & Semantic HTML)
    """
    host = (urlparse(url).hostname or "").lower()

    if "linkedin.com" in host:
        res = extract_linkedin_job(url)
        if res:
            return res

    if "unstop.com" in host:
        res = extract_unstop_job(url)
        if res:
            return res

    if "internshala.com" in host:
        res = extract_internshala_job(url)
        if res:
            return res

    if "indeed." in host:
        res = extract_indeed_job(url)
        if res:
            return res

    if "naukri.com" in host:
        res = extract_naukri_job(url)
        if res:
            return res

    if "glassdoor." in host:
        res = extract_glassdoor_job(url)
        if res:
            return res

    # Generic fallback for any other career page (Greenhouse, Lever, Company Career Sites)
    st, html_text = _cffi_get(url)
    if st == 200 and html_text:
        ld_res = extract_job_posting_from_json_ld(html_text)
        if ld_res["found"] and ld_res.get("job_description"):
            role = ld_res["job_role"] or "Target Role"
            comp = ld_res["company_name"] or host.replace("www.", "").split(".")[0].title()
            return {
                "job_role": role,
                "company_name": comp,
                "job_description": format_structured_jd(role, comp, ld_res["job_description"]),
                "source_portal": comp,
            }

        # Semantic HTML extraction when JSON-LD is absent
        soup = BeautifulSoup(html_text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "svg"]):
            tag.decompose()

        h1 = soup.find("h1")
        title_tag = soup.find("title")
        role = (
            h1.get_text(" ", strip=True)
            if h1
            else (title_tag.get_text(" ", strip=True).split("|")[0].split("-")[0].strip() if title_tag else "Target Role")
        )
        comp = host.replace("www.", "").replace("boards.", "").replace("jobs.", "").split(".")[0].title()

        main_el = (
            soup.find("main")
            or soup.find("article")
            or soup.find(attrs={"class": re.compile(r"job-description|description|content|posting", re.I)})
            or soup.body
        )
        body_text = clean_html_description(str(main_el)) if main_el else ""
        if len(body_text) >= 40:
            return {
                "job_role": role[:120],
                "company_name": comp[:120],
                "job_description": format_structured_jd(role[:120], comp[:120], body_text[:8000]),
                "source_portal": comp,
            }

    return None
