"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

type ThemeContextType = {
  currentTheme: string;
  isLoading: boolean;
  isDef: boolean;
  isHalloween: boolean;
  isXmas: boolean;
  isRamadan: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: "default",
  isLoading: true,
  isDef: true,
  isHalloween: false,
  isXmas: false,
  isRamadan: false,
});

export const useTheme = () => useContext(ThemeContext);

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const themeDocRef = doc(db, "siteSettings", "theme");

    // Use onSnapshot for real-time updates when theme changes
    const unsubscribe = onSnapshot(
      themeDocRef,
      (doc) => {
        if (doc.exists()) {
          const themeData = doc.data();
          setCurrentTheme(themeData.theme || "default");
        } else {
          setCurrentTheme("default");
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching theme:", error);
        setCurrentTheme("default");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Theme boolean functions
  const isDef = currentTheme === "default";
  const isHalloween = currentTheme === "halloween";
  const isXmas = currentTheme === "christmas";
  const isRamadan = currentTheme === "ramadan";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        isLoading,
        isDef,
        isHalloween,
        isXmas,
        isRamadan,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
