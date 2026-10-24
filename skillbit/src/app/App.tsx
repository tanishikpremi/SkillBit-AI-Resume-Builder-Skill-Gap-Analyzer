import { RouterProvider } from "react-router"
import { AppProvider } from "../lib/store"
import { ThemeProvider } from "../lib/theme"
import { router } from "./routes"

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </ThemeProvider>
  )
}
