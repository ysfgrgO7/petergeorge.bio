// components/ConfirmModal.tsx
"use client";

import React from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  children?: React.ReactNode; // 👈 allow extra content (like dropdown)
}

const PopupModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
  confirmText = "Yes",
  cancelText = "No",
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "var(--black)",
          color: "var(--white)",
          padding: "1.5rem",
          borderRadius: "8px",
          width: "90%",
          maxWidth: "400px",
          textAlign: "center",
          boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
        }}
      >
        <p style={{ marginBottom: "1rem" }}>{message}</p>

        {/* 👇 extra content goes here */}
        {children && <div style={{ marginBottom: "1rem" }}>{children}</div>}

        <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
          <button
            onClick={onConfirm}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--green)",
              color: "var(--white)",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--light)",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PopupModal;
