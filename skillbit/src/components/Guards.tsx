import { Navigate, Outlet, useLocation } from "react-router"
import { useApp } from "../lib/store"
import Dashboard from "../pages/Dashboard"

export function RequireAuth() {
  const { user } = useApp()
  const loc = useLocation()
  if (!user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: loc.pathname + loc.search }}
      />
    )
  return <Outlet />
}

export function RequireAdmin() {
  const { user } = useApp()
  if (user?.role !== "admin") return <Navigate to="/app" replace />
  return <Outlet />
}

/** Admins land on the placement portal; candidates on their dashboard. */
export function UserIndex() {
  const { user } = useApp()
  if (user?.role === "admin") return <Navigate to="/app/admin" replace />
  return <Dashboard />
}
