"use client";

import { useEffect } from "react";

export default function DisableInteractions() {
  useEffect(() => {
    // --- Interaction Disabling Logic (Only runs for non-admins) ---

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable text selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Disable drag operations
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Block keyboard shortcuts
    const blockKeys = (e: KeyboardEvent) => {
      // Block common shortcuts
      if (
        e.key === "PrintScreen" ||
        (e.ctrlKey && e.key === "c") ||
        (e.ctrlKey && e.key === "a") ||
        (e.ctrlKey && e.key === "u") ||
        (e.ctrlKey && e.key === "s") ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.shiftKey && e.key === "C") ||
        e.key === "F12"
      ) {
        e.preventDefault();
        return false;
      }
    };

    // Handle touch events for mobile (including long press)
    let touchTimer: NodeJS.Timeout | undefined;
    const handleTouchStart = (e: TouchEvent) => {
      if (touchTimer) {
        clearTimeout(touchTimer);
      }
      touchTimer = setTimeout(() => {
        e.preventDefault();
      }, 500);
    };

    const handleTouchEnd = () => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = undefined;
      }
    };

    const handleTouchMove = () => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = undefined;
      }
    };

    // Add event listeners
    document.addEventListener("contextmenu", handleContextMenu, {
      passive: false,
    });
    document.addEventListener("selectstart", handleSelectStart, {
      passive: false,
    });
    document.addEventListener("dragstart", handleDragStart, { passive: false });
    document.addEventListener("keydown", blockKeys, { passive: false });
    document.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    document.addEventListener("touchend", handleTouchEnd, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });

    // Apply CSS to disable text selection and user interactions
    const style = document.createElement("style");
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      
      *::selection {
        background: transparent !important;
      }
      
      *::-moz-selection {
        background: transparent !important;
      }
      
      img {
        -webkit-user-drag: none !important;
        -khtml-user-drag: none !important;
        -moz-user-drag: none !important;
        -o-user-drag: none !important;
        user-drag: none !important;
        pointer-events: none !important;
      }
      
      body {
        cursor: default !important;
      }
      
      body {
        -webkit-user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: rgba(0,0,0,0) !important;
      }
    `;
    document.head.appendChild(style);

    // Cleanup function
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("keydown", blockKeys);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchmove", handleTouchMove);

      if (touchTimer) {
        clearTimeout(touchTimer);
      }

      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  return null;
}
