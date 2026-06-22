import { createContext, useContext, useEffect, useState } from "react"

const ThemeContext = createContext()

// Read the saved theme once, before first paint, to avoid a flash of the wrong theme.
const getInitialTheme = () => {
  if (typeof window === "undefined") return "dark"
  return localStorage.getItem("theme") || "dark"
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    // The `light` class inverts the richblack scale defined in index.css.
    root.classList.toggle("light", theme === "light")
    localStorage.setItem("theme", theme)
  }, [theme])

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
