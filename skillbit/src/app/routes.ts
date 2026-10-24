import { createBrowserRouter } from "react-router"
import Root from "./Root"
import AppShell from "../components/AppShell"
import { RequireAdmin, RequireAuth, UserIndex } from "../components/Guards"
import Home from "../pages/Home"
import { Login, Signup } from "../pages/Auth"
import Upload from "../pages/Upload"
import NewMatch from "../pages/NewMatch"
import Analysis from "../pages/Analysis"
import Roadmaps from "../pages/Roadmaps"
import Builder from "../pages/Builder"
import Profile from "../pages/Profile"
import History from "../pages/History"
import Admin from "../pages/Admin"
import NotFound from "../pages/NotFound"

export const router = createBrowserRouter([
  {
    Component: Root,
    ErrorBoundary: NotFound,
    children: [
      { path: "/", Component: Home },
      { path: "/login", Component: Login },
      { path: "/signup", Component: Signup },
      {
        path: "/app",
        Component: RequireAuth,
        children: [
          {
            Component: AppShell,
            children: [
              { index: true, Component: UserIndex },
              { path: "upload", Component: Upload },
              { path: "match", Component: NewMatch },
              { path: "match/:id", Component: Analysis },
              { path: "roadmaps", Component: Roadmaps },
              { path: "builder", Component: Builder },
              { path: "profile", Component: Profile },
              { path: "history", Component: History },
              {
                path: "admin",
                Component: RequireAdmin,
                children: [{ index: true, Component: Admin }],
              },
            ],
          },
        ],
      },
      { path: "*", Component: NotFound },
    ],
  },
])
