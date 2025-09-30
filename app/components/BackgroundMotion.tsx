"use client";

import { useEffect } from "react";

export default function BackgroundMotion() {
  useEffect(() => {
    const grid = document.getElementById("bg-grid");
    if (!grid) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;

    const handleMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const animate = () => {
      // Lerp toward target for smooth trail
      currentX += (targetX - currentX) * 0.09;
      currentY += (targetY - currentY) * 0.09;

      grid.style.setProperty("--mx", `${currentX}px`);
      grid.style.setProperty("--my", `${currentY}px`);

      requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMove);
    animate();

    return () => {
      window.removeEventListener("mousemove", handleMove);
    };
  }, []);

  return null;
}
