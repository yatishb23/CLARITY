"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ModeToggle() {
  const { setTheme, resolvedTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg transition-all duration-200"
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-surface-dim)",
      }}
    >
      {/* Sun */}
      <Sun className="h-[1.1rem] w-[1.1rem] dark:opacity-0 dark:scale-0 transition-all"
        style={{ color: "var(--color-text-dim)" }}
      />

      {/* Moon */}
      <Moon className="absolute inset-0 m-auto h-[1.1rem] w-[1.1rem] opacity-0 scale-0 dark:opacity-100 dark:scale-100 transition-all"
        style={{ color: "var(--color-accent)" }}
      />

      <span className="sr-only">Toggle theme</span>
    </button>
  )
}