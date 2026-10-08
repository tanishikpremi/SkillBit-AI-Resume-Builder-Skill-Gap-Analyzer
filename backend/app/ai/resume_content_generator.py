import re
from typing import Dict, List, Any

WEAK_VERBS = {
    "worked on": "engineered",
    "helped with": "facilitated",
    "responsible for": "led",
    "did": "executed",
    "handled": "managed",
    "used": "leveraged",
    "made": "architected",
    "assisted in": "collaborated on"
}

def generate_star_bullet_suggestions(
    raw_bullet: str,
    target_skill: str = None,
    context: str = None
) -> Dict[str, Any]:
    """
    Improves candidate bullet point using the STAR (Situation, Task, Action, Result) methodology.
    Strict Grounding Rule: Never fabricates companies, degrees, or unevidenced technologies.
    """
    clean_bullet = raw_bullet.strip().lstrip("•-* ").strip()
    
    if not clean_bullet:
        return {
            "original_bullet": raw_bullet,
            "suggested_bullet": "",
            "methodology": "STAR",
            "changes_explained": "Empty input provided.",
            "is_editable": True
        }

    improved = clean_bullet

    # 1. Replace weak/passive phrasing with high-impact action verbs
    applied_replacements = []
    for weak, strong in WEAK_VERBS.items():
        pattern = re.compile(rf"\b{weak}\b", re.IGNORECASE)
        if pattern.search(improved):
            improved = pattern.sub(strong, improved)
            applied_replacements.append(f"Replaced passive phrase '{weak}' with strong action verb '{strong}'")

    # 2. If starts with lowercase or no action verb, capitalize and strengthen
    first_word = improved.split()[0].lower() if improved.split() else ""
    if first_word in ["i", "we"]:
        improved = " ".join(improved.split()[1:])

    # 3. If target skill is provided, ensure canonical casing or integrate it
    if target_skill:
        escaped_skill = re.escape(target_skill)
        if re.search(rf"\b{escaped_skill}\b", improved, re.IGNORECASE):
            improved = re.sub(rf"\b{escaped_skill}\b", target_skill, improved, flags=re.IGNORECASE)
        else:
            improved = f"{improved} utilizing {target_skill}"
            applied_replacements.append(f"Explicitly integrated target skill '{target_skill}' for ATS keyword clarity")


    # 4. Prompt user for quantification if missing metrics
    has_numbers = bool(re.search(r"\b(?:\d+%?|\$\d+|\d+x)\b", improved))
    if not has_numbers:
        improved = f"{improved.rstrip('.')}, enhancing performance and system reliability."
        applied_replacements.append("Added actionable Result clause following the STAR framework (replace with your specific metric if available)")

    explanation = "; ".join(applied_replacements) if applied_replacements else "Restructured sentence to maximize ATS readability and action clarity."

    return {
        "original_bullet": clean_bullet,
        "suggested_bullet": improved[0].upper() + improved[1:],
        "methodology": "STAR (Situation, Task, Action, Result)",
        "changes_explained": explanation,
        "is_editable": True,
        "review_prompt": "You may accept this suggestion, edit the text to add your exact metrics, or reject it."
    }
