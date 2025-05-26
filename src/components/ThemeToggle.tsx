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


const getInitialTheme = (): string => {
  if (typeof window !== "undefined") {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme && (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system")) {
      return storedTheme;
    }
    // For "system", we determine initial actual theme but store "system"
    if (storedTheme === "system" || !storedTheme) {
         return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  }
  return "light"; 
};

const getStoredPreference = (): string => {
    if (typeof window !== "undefined") {
        const storedTheme = localStorage.getItem("theme");
        if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
            return storedTheme;
        }
    }
    return "system"; // Default preference if nothing stored or invalid
}


export function ThemeToggle() {
  const [theme, setThemeState] = React.useState<string>("light"); // actual theme (light/dark)
  const [themePreference, setThemePreferenceState] = React.useState<string>("system"); // user preference (light/dark/system)
  const t = useI18n();

  React.useEffect(() => {
    const initialPreference = getStoredPreference();
    setThemePreferenceState(initialPreference);
    if (initialPreference === "system") {
      setThemeState(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } else {
      setThemeState(initialPreference);
    }
  }, []);

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    
    let currentTheme = theme;
    if (themePreference === "system") {
        currentTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    root.classList.add(currentTheme);
    localStorage.setItem("theme", themePreference); // Store the preference
  }, [theme, themePreference]);


  // Listener for system theme changes
  React.useEffect(() => {
    if (themePreference === "system") {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            setThemeState(mediaQuery.matches ? "dark" : "light");
        };
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [themePreference]);


  const setTheme = (newThemePreference: string) => {
    setThemePreferenceState(newThemePreference);
    if (newThemePreference === "system") {
        setThemeState(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } else {
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
        <DropdownMenuItem onClick={() => setTheme("light")}>
          {t('theme.light')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          {t('theme.dark')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          {t('theme.system')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
