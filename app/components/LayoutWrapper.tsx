"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "./navbar";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const isQuizPage = pathname.includes("/courses/lectures/quiz"); // Adjust the path as needed

  useEffect(() => {
    const updatePadding = () => {
      if (typeof window === "undefined") return;

      // Add horizontal padding for quiz pages on desktop only
      if (isQuizPage) {
        if (window.innerWidth <= 768) {
          document.body.style.paddingLeft = "0px";
          document.body.style.paddingRight = "0px";
        } else {
          document.body.style.paddingLeft = "50px";
          document.body.style.paddingRight = "50px";
        }
        return;
      }

      // Normal padding logic for non-quiz pages
      if (window.innerWidth <= 768) {
        document.body.style.paddingLeft = "0px";
      } else {
        document.body.style.paddingLeft = isCollapsed ? "70px" : "200px";
      }
    };

    updatePadding();
    window.addEventListener("resize", updatePadding);

    return () => window.removeEventListener("resize", updatePadding);
  }, [isCollapsed, isQuizPage]); // Added isQuizPage to dependencies

  return (
    <>
      {/* Pass the state down to Navbar */}
      {!isQuizPage && (
        <Navbar onCollapse={setIsCollapsed} isCollapsed={isCollapsed} />
      )}
      {children}
    </>
  );
}
