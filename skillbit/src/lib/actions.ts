import { matchResume, parseJob, parseResume } from "./engine"
import {
  uid,
  type AnalysisDoc,
  type BuilderDraft,
  type ResumeDoc,
} from "./store"
import type { Skill } from "./taxonomy"

export function createResume(
  text: string,
  title: string,
  source: ResumeDoc["source"],
  taxonomy: Skill[],
  fileName?: string,
): ResumeDoc {
  return {
    id: uid(),
    title: title.trim() || "Untitled resume",
    source,
    fileName,
    text,
    parsed: parseResume(text, taxonomy),
    createdAt: Date.now(),
  }
}

export function createAnalysis(
  resume: ResumeDoc,
  jobText: string,
  taxonomy: Skill[],
): AnalysisDoc {
  // Re-parse so custom taxonomy additions apply to older resumes too.
  const parsed = parseResume(resume.text, taxonomy)
  const job = parseJob(jobText, taxonomy)
  return {
    id: uid(),
    resumeId: resume.id,
    resumeTitle: resume.title,
    jobTitle: job.title,
    company: job.company || "Unspecified company",
    jobText,
    job,
    result: matchResume(parsed, resume.text, job, jobText, taxonomy),
    createdAt: Date.now(),
  }
}

/** Serialises the builder draft into the plain-text layout the parser understands. */
export function draftToText(d: BuilderDraft) {
  const lines: string[] = [
    d.name,
    [d.email, d.phone, d.location, d.linkedin, d.github]
      .filter(Boolean)
      .join(" | "),
    "",
  ]
  if (d.summary.trim()) lines.push("SUMMARY", d.summary.trim(), "")
  const block = (head: string, list: BuilderDraft["experience"]) => {
    const filled = list.filter((e) => e.title || e.org)
    if (!filled.length) return
    lines.push(head)
    for (const e of filled) {
      lines.push(
        [e.title, e.org].filter(Boolean).join(" — ") +
          (e.period ? ` (${e.period})` : ""),
      )
      if (e.link) lines.push(e.link)
      for (const b of e.bullets.filter((x) => x.trim()))
        lines.push(`- ${b.trim()}`)
    }
    lines.push("")
  }
  block("EXPERIENCE", d.experience)
  block("PROJECTS", d.projects)
  block("EDUCATION", d.education)
  if (d.skills.trim()) lines.push("SKILLS", d.skills.trim())
  return lines.join("\n")
}

export function download(name: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const roadmapProgress = (
  progress: Record<string, string[]>,
  skill: string,
) => Math.round(((progress[skill]?.length ?? 0) / 16) * 100)
