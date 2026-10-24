import { useLayoutEffect } from "react";

/** Keep operator pages and their portalled menus/dialogs light before paint. */
export function useDataEntryLightTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    const previousColorScheme = root.style.colorScheme;
    root.classList.remove("dark");
    root.style.colorScheme = "light";

    return () => {
      root.classList.toggle("dark", wasDark);
      root.style.colorScheme = previousColorScheme;
    };
  }, []);
}
