# AI Resume Builder & Skill Gap Analyzer — Academic Architecture & Viva Defense Reference

> **Prepared for Academic Defense, Technical Viva, and Software Architecture Evaluation**

---

## 1. Executive Summary & Design Philosophy

Commercial resume builders frequently make one of two fundamental mistakes:
1. **Shallow Keyword Counters**: Rigid keyword counters that fail to recognize aliases, synonyms, or the depth of evidence in experience bullet points.
2. **Opaque Black-Box Chatbots**: Pure generative LLM wrappers that fabricate candidate credentials, produce non-reproducible scores, and fail to explain why a skill is considered a gap.

Our system implements a **Hybrid AI Architecture**:
- **Deterministic Rules & Taxonomy**: Handles canonical normalization, alias mapping, mathematical scoring, security, authorization, and zero-fabrication guardrails.
- **Natural Language Processing & Embeddings**: Handles structural section classification, gazetteer n-gram skill extraction, action-verb detection, and TF-IDF subword semantic similarity.
- **Constrained Generative Layer**: Provides STAR-method bullet refinement strictly grounded in the candidate's actual text, and contextual explanations.

---

## 2. Core NLP & Matching Pipeline Architecture

```
                    ┌────────────────────────┐
                    │ Raw Resume Document    │ (PDF / DOCX / TXT)
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ Layout-Aware PyMuPDF   │ Block extraction & hyphen unwrap
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │  Section Classifier    │ Contact, Summary, Experience,
                    │                        │ Education, Projects, Skills
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ Contextual Extractor   │ N-gram gazetteer matching +
                    │ & Evidence Tracer      │ Action verb detection
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ Candidate Skill Profile│ Canonical IDs + Evidence Levels
                    └───────────┬────────────┘
                                │
       Target Job Text          │
             │                  │
             ▼                  │
 ┌───────────────────────┐      │
 │  Job NLP Analyzer     │      │
 │  - Required (W=1.0)   │      │
 │  - Preferred (W=0.5)  │      │
 └───────────┬───────────┘      │
             │                  │
             ▼                  ▼
      ┌─────────────────────────────────┐
      │  Explainable Hybrid Matcher     │
      │  - Exact & Normalized Multiplier│
      │  - Evidence Level Weight        │
      │  - Subword Semantic Cosine      │
      └────────────────┬────────────────┘
                       │
                       ▼
      ┌─────────────────────────────────┐
      │  4-Tier Skill Gap Analyzer      │
      │  - Strong Match, Partial Match, │
      │    Weak Evidence, Missing       │
      └────────────────┬────────────────┘
                       │
                       ▼
      ┌─────────────────────────────────┐
      │  Recommendation Engine & STAR   │
      │  - Concepts, Projects, Certs    │
      │  - User-Reviewable STAR Bullets │
      └─────────────────────────────────┘
```

---

## 3. Mathematical Formulation of the Fit Index

The match score $S \in [0.0, 100.0]$ is computed deterministically:

$$S = \min\left(100.0, \frac{\sum_{i \in \text{JobSkills}} W_i \cdot \mathcal{F}(i, \text{Profile})}{\sum_{i \in \text{JobSkills}} W_i} \times 100\right)$$

Where:
- $W_i$: Importance weighting factor:
  $$W_i = \begin{cases} 1.0 & \text{if requirement is Core/Required} \\ 0.5 & \text{if requirement is Preferred/Bonus} \end{cases}$$
- $\mathcal{F}(i, \text{Profile}) \in [0.0, 1.0]$ is the candidate alignment factor for skill $i$:
  $$\mathcal{F}(i) = 0.60 \cdot \mathcal{M}_{\text{exact}} + 0.40 \cdot \max(\mathcal{E}_{\text{level}}, \mathcal{S}_{\text{semantic}})$$
  - $\mathcal{M}_{\text{exact}} = 1.0$ if the canonical skill or registered alias appears in candidate data, else $0.0$.
  - $\mathcal{E}_{\text{level}}$ is the verified candidate evidence tier:
    - **$1.00$ (STRONG)**: Found in Work Experience or Projects with action verbs and quantifiable metrics.
    - **$0.85$ (MODERATE)**: Found in Work Experience or Projects without action verbs.
    - **$0.60$ (LISTED)**: Listed only in a raw skills inventory block.
    - **$0.40$ (MENTIONED)**: Casual mention in summary or profile overview.
  - $\mathcal{S}_{\text{semantic}}$ is the subword character and token TF-IDF cosine similarity between the job requirement context snippet and candidate bullet points.

---

## 4. Skill Gap Classification & Priority Matrix

| Gap Status | Criteria | Priority | Explanation Generated |
| :--- | :--- | :--- | :--- |
| **`STRONG_MATCH`** | Canonical match verified in Experience/Projects with strong action verbs. | `LOW` | Validated in production/project history with excerpted evidence snippet. |
| **`WEAK_EVIDENCE`** | Skill listed in resume skills list, but missing from work accomplishment bullets. | `HIGH` (if Required)<br>`MEDIUM` (if Preferred) | Advises adding metrics, architecture decisions, and business impact. |
| **`PARTIAL_MATCH`** | High semantic similarity in related technology, but specific modern tool is missing. | `MEDIUM` | Identifies transferrable knowledge and what specific delta remains. |
| **`MISSING`** | Completely absent from candidate profile and resume. | `HIGH` (if Required)<br>`MEDIUM` (if Preferred) | Prescribes zero-to-hero learning path and hands-on practice project. |

---

## 5. Responsible AI & Anti-Hallucination Guardrails

1. **Zero Qualification Invention**:
   - The AI is strictly barred from generating degrees, companies, job titles, certifications, or metrics not evidenced by the candidate.
2. **Human-in-the-Loop Authority**:
   - Every AI-suggested bullet point presented to the candidate must support explicit **Accept**, **Edit**, or **Reject** actions.
3. **No Employment Guarantees**:
   - Every score and dashboard clearly presents the legal and ethical disclaimer: *"This score is an automated ATS alignment indicator and does not guarantee employment or interview selection."*
4. **Data Privacy**:
   - Resumes are stored in a private directory with unique UUID filenames and are never publicly accessible.
