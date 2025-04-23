import { ThemeContext } from "@/components/themes/theme-context";
import { themes } from "@/components/themes/use-colors";
import { useContext } from "react";

export function useTheme() {
    const { theme, toggleTheme } = useContext(ThemeContext);
    const colors = themes[theme];
    
    return { theme, toggleTheme, colors };
}