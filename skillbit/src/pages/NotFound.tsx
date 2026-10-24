import { isRouteErrorResponse, useRouteError } from "react-router"
import { ArrowLeft } from "lucide-react"
import { Backdrop, ButtonLink, LogoMark } from "../components/ui"

export default function NotFound() {
  const err = useRouteError()
  const crashed = err && !(isRouteErrorResponse(err) && err.status === 404)
  return (
    <div className="grain relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-canvas px-6 text-center">
      <Backdrop position="65% 70%" />
      <LogoMark className="size-20" label="SkillBit" />
      <div className="mt-8 font-grid text-[clamp(96px,16vw,220px)] font-semibold leading-none">
        {crashed ? "ERR" : "404"}
      </div>
      <p className="mt-4 max-w-md font-machina text-xl text-fg/85">
        {crashed
          ? "Something went wrong while rendering this page."
          : "This page drifted out of orbit."}
      </p>
      <ButtonLink to="/" variant="primary" size="lg" className="mt-10">
        <ArrowLeft size={18} /> Back to home
      </ButtonLink>
    </div>
  )
}
