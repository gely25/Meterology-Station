"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-9 w-20 rounded-full bg-muted animate-pulse shrink-0" />
  }

  const isDark = theme === "dark"

  return (
    <div className="relative flex items-center bg-muted/60 border border-border p-1 rounded-full w-20 h-9 select-none shrink-0">
      {/* Sliding active background indicator */}
      <div 
        className={cn(
          "absolute top-0.5 bottom-0.5 left-0.5 w-[34px] rounded-full bg-card shadow-md transition-transform duration-300 ease-out border border-border/20",
          isDark ? "translate-x-10" : "translate-x-0"
        )}
      />
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "relative z-10 flex-1 flex items-center justify-center transition-colors h-full rounded-full",
          !isDark ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        title="Modo Claro"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "relative z-10 flex-1 flex items-center justify-center transition-colors h-full rounded-full",
          isDark ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
        title="Modo Oscuro"
      >
        <Moon className="h-4 w-4" />
      </button>
    </div>
  )
}
