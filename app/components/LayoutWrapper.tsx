"use client";

import { useEffect, useState } from "react";
import Navbar from "./navbar";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const updatePadding = () => {
      if (typeof window === "undefined") return;
      if (window.innerWidth <= 768) {
        document.body.style.paddingLeft = "0px";
      } else {
        document.body.style.paddingLeft = isCollapsed ? "70px" : "200px";
      }
    };

    updatePadding();
    window.addEventListener("resize", updatePadding);

    return () => window.removeEventListener("resize", updatePadding);
  }, [isCollapsed]);

  return (
    <>
      {/* Pass the state down to Navbar */}
      <Navbar onCollapse={setIsCollapsed} isCollapsed={isCollapsed} />
      {children}
    </>
  );
}
