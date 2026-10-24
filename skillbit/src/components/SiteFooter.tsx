import { Link } from "react-router"
import { Logo } from "./ui"

export function SiteFooter() {
  return (
    <footer className="relative border-t border-fg/10 bg-band-deep">
      <div className="mx-auto grid max-w-[1600px] gap-12 px-6 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-[5.5vw]">
        <div>
          <Logo size={56} withWord />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-fg/55">
            Explainable AI resume builder, ATS job matcher and visual skill-gap
            engine. Deterministic scores, human-in-the-loop AI, zero fabricated
            credentials.
          </p>
        </div>
        {[
          {
            h: "Product",
            l: [
              ["How it works", "/#how"],
              ["Features", "/#features"],
              ["Resume builder", "/app/builder"],
              ["Job match", "/app/match"],
            ],
          },
          {
            h: "Platform",
            l: [
              ["Dashboard", "/app"],
              ["Skill roadmaps", "/app/roadmaps"],
              ["Placement portal", "/app/admin"],
              ["About", "/#about"],
            ],
          },
          {
            h: "Account",
            l: [
              ["Log in", "/login"],
              ["Create account", "/signup"],
              ["Profile", "/app/profile"],
            ],
          },
        ].map((col) => (
          <div key={col.h}>
            <div className="mb-4 font-grid text-[12px] uppercase tracking-[0.2em] text-accent">
              {col.h}
            </div>
            <ul className="space-y-2.5">
              {col.l.map(([label, href]) => (
                <li key={label}>
                  {href.startsWith("/#") ? (
                    <a href={href} className="text-sm text-fg/65 hover:text-fg">
                      {label}
                    </a>
                  ) : (
                    <Link
                      to={href}
                      className="text-sm text-fg/65 hover:text-fg"
                    >
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-fg/10">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-6 py-6 text-xs text-fg/40 md:flex-row md:justify-between md:px-[5.5vw]">
          <span>© {new Date().getFullYear()} SkillBit · MIT License</span>
          <span>
            Scores are automated ATS alignment indicators and do not guarantee
            employment or interview selection.
          </span>
        </div>
      </div>
    </footer>
  )
}
