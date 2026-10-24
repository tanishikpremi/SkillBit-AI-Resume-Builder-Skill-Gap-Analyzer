import { Outlet, ScrollRestoration } from "react-router"

export default function Root() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
