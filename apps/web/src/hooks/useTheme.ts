"use client";

import { useTheme as useNextTheme } from "next-themes";

export function useTheme() {
  const { theme, setTheme, systemTheme, resolvedTheme } = useNextTheme();

  const toggleTheme = () => {
    if (resolvedTheme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  const isDark = resolvedTheme === "dark";
  const isLight = resolvedTheme === "light";

  return {
    theme,
    setTheme,
    systemTheme,
    resolvedTheme,
    toggleTheme,
    isDark,
    isLight,
  };
}
