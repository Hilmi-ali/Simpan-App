import React, { useContext } from "react";
import { ThemeContext } from "./ThemeContext";

export default function ThemeToggleButton() {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <button onClick={toggleTheme} className="theme-toggle">
      {theme === "dark" ? "☀️ Mode Terang" : "🌙 Mode Gelap"}
    </button>
  );
}
