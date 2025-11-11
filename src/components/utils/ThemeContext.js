import React, { createContext, useState, useEffect } from "react";

// Membuat context untuk tema
export const ThemeContext = createContext();

// Provider untuk membungkus seluruh aplikasi
export const ThemeProvider = ({ children }) => {
  // Ambil tema dari localStorage, default "dark"
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  // Saat tema berubah, simpan ke localStorage & ubah class body
  useEffect(() => {
    document.body.className = theme; // contoh: "dark" atau "light"
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Fungsi untuk toggle tema
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
