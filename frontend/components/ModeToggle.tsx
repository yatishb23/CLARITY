"use client"

import { Moon, Sun } from "lucide-react"

export function ModeToggle() {
  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark")
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg border 
                 border-neutral-200 dark:border-neutral-800
                 bg-neutral-100 dark:bg-neutral-900
                 hover:bg-neutral-200 dark:hover:bg-neutral-800
                 transition"
    >
      {/* Sun */}
      <Sun className="h-[1.2rem] w-[1.2rem] 
                      text-neutral-700 
                      dark:opacity-0 dark:scale-0 
                      transition-all" />

      {/* Moon */}
      <Moon className="absolute inset-0 m-auto h-[1.2rem] w-[1.2rem] 
                       text-neutral-300 
                       opacity-0 scale-0 
                       dark:opacity-100 dark:scale-100 
                       transition-all" />

      <span className="sr-only">Toggle theme</span>
    </button>
  )
}