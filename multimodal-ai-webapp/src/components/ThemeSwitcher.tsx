"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Sun, Moon, Monitor, Palette } from "lucide-react"

export type ThemeVariant = "orange-light" | "orange-dark" | "monochrome-light" | "monochrome-dark" | "system"

interface ThemeSwitcherProps {
  className?: string
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const [theme, setTheme] = useState<ThemeVariant>("system")
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem("theme") as ThemeVariant
    if (savedTheme) {
      setTheme(savedTheme)
      applyTheme(savedTheme)
    } else {
      // Default to system preference
      setTheme("system")
      applyTheme("system")
    }
  }, [])

  // Apply theme classes to document
  const applyTheme = (themeVariant: ThemeVariant) => {
    const root = document.documentElement
    
    // Remove all theme classes
    root.classList.remove("orange-light", "orange-dark", "monochrome-light", "monochrome-dark")
    
    // Apply new theme
    switch (themeVariant) {
      case "orange-light":
        root.classList.remove("dark", "monochrome")
        root.classList.add("orange-light")
        break
      case "orange-dark":
        root.classList.remove("monochrome")
        root.classList.add("dark", "orange-dark")
        break
      case "monochrome-light":
        root.classList.remove("dark")
        root.classList.add("monochrome", "monochrome-light")
        break
      case "monochrome-dark":
        root.classList.add("dark", "monochrome", "monochrome-dark")
        break
      case "system":
        // Detect system preference
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        const prefersMonochrome = window.matchMedia("(prefers-contrast: more)").matches
        
        if (prefersMonochrome) {
          root.classList.add("monochrome")
          if (prefersDark) {
            root.classList.add("dark", "monochrome-dark")
          } else {
            root.classList.add("monochrome-light")
          }
        } else {
          root.classList.remove("monochrome")
          if (prefersDark) {
            root.classList.add("dark", "orange-dark")
          } else {
            root.classList.add("orange-light")
          }
        }
        break
    }
  }

  // Handle theme change
  const handleThemeChange = (newTheme: ThemeVariant) => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    applyTheme(newTheme)
  }

  // Get current theme icon
  const getThemeIcon = () => {
    switch (theme) {
      case "orange-light":
        return <Sun className="h-4 w-4" />
      case "orange-dark":
        return <Moon className="h-4 w-4" />
      case "monochrome-light":
        return <Palette className="h-4 w-4" />
      case "monochrome-dark":
        return <Palette className="h-4 w-4" />
      case "system":
        return <Monitor className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  // Get theme display name
  const getThemeName = () => {
    switch (theme) {
      case "orange-light":
        return "Orange Light"
      case "orange-dark":
        return "Orange Dark"
      case "monochrome-light":
        return "Monochrome Light"
      case "monochrome-dark":
        return "Monochrome Dark"
      case "system":
        return "System"
      default:
        return "System"
    }
  }

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${className}`}>
        <Monitor className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${className}`}>
                {getThemeIcon()}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Theme: {getThemeName()}</p>
          </TooltipContent>
        </Tooltip>
        
        <DropdownMenuContent align="end" side="bottom">
          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
            Theme Preferences
          </div>
          
          {/* Orange Themes */}
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
            Orange Themes
          </div>
          <DropdownMenuItem onClick={() => handleThemeChange("orange-light")}>
            <div className="flex items-center gap-2 w-full">
              <Sun className="h-4 w-4" />
              <span>Orange Light</span>
              {theme === "orange-light" && (
                <div className="ml-auto h-2 w-2 rounded-full bg-orange-500"></div>
              )}
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleThemeChange("orange-dark")}>
            <div className="flex items-center gap-2 w-full">
              <Moon className="h-4 w-4" />
              <span>Orange Dark</span>
              {theme === "orange-dark" && (
                <div className="ml-auto h-2 w-2 rounded-full bg-orange-500"></div>
              )}
            </div>
          </DropdownMenuItem>
          
          {/* Monochrome Themes */}
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
            Monochrome Themes
          </div>
          <DropdownMenuItem onClick={() => handleThemeChange("monochrome-light")}>
            <div className="flex items-center gap-2 w-full">
              <Palette className="h-4 w-4" />
              <span>Monochrome Light</span>
              {theme === "monochrome-light" && (
                <div className="ml-auto h-2 w-2 rounded-full bg-gray-500"></div>
              )}
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleThemeChange("monochrome-dark")}>
            <div className="flex items-center gap-2 w-full">
              <Palette className="h-4 w-4" />
              <span>Monochrome Dark</span>
              {theme === "monochrome-dark" && (
                <div className="ml-auto h-2 w-2 rounded-full bg-gray-500"></div>
              )}
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* System Theme */}
          <DropdownMenuItem onClick={() => handleThemeChange("system")}>
            <div className="flex items-center gap-2 w-full">
              <Monitor className="h-4 w-4" />
              <span>System Preference</span>
              {theme === "system" && (
                <div className="ml-auto h-2 w-2 rounded-full bg-blue-500"></div>
              )}
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}
