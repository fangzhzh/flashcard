
"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/client";

// Helper function to safely get stored preference on client
const getStoredThemePreference = (): string => {
  if (typeof window !== "undefined") {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
      return storedTheme;
    }
  }
  return "system"; // Default preference if nothing stored or invalid
};

export function ThemeToggle() {
  // Initialize with a default non-browser-dependent value
  const [theme, setThemeState] = React.useState<string>("light"); 
  const [themePreference, setThemePreferenceState] = React.useState<string>("system");
  const t = useI18n();

  // Effect to set initial theme based on localStorage and system preference (runs only on client)
  React.useEffect(() => {
    const initialPreference = getStoredThemePreference();
    setThemePreferenceState(initialPreference);

    if (initialPreference === "system") {
      setThemeState(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } else {
      setThemeState(initialPreference);
    }
  }, []);

  // Effect to apply the theme to the document and save preference to localStorage
  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    
    let currentThemeToApply = theme;
    // If preference is system, derive actual theme from media query
    if (themePreference === "system") {
        currentThemeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    
    root.classList.add(currentThemeToApply);
    localStorage.setItem("theme", themePreference);
  }, [theme, themePreference]); // Rerun when actual theme or preference changes


  // Listener for system theme changes when "system" preference is selected
  React.useEffect(() => {
    if (themePreference !== "system") {
      return; // Only listen if system preference is active
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
        // This will trigger the above useEffect to apply the new theme
        setThemeState(mediaQuery.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themePreference]); // Re-attach listener if themePreference changes to/from "system"


  const handleSetThemePreference = (newThemePreference: string) => {
    setThemePreferenceState(newThemePreference); // Update the stored preference
    if (newThemePreference === "system") {
      // If switching to system, immediately update theme based on current system setting
      setThemeState(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } else {
      // If switching to light/dark directly, set that as the active theme
      setThemeState(newThemePreference);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t('theme.toggle')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleSetThemePreference("light")}>
          {t('theme.light')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetThemePreference("dark")}>
          {t('theme.dark')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetThemePreference("system")}>
          {t('theme.system')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
