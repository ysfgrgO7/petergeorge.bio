// app/ConfirmModal.tsx
"use client";

import React from "react";

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  message,
  onConfirm,
  onCancel,
}) => {
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
          padding: "1.5rem",
          borderRadius: "8px",
          width: "90%",
          maxWidth: "400px",
          textAlign: "center",
          boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
        }}
      >
        <p style={{ marginBottom: "1rem" }}>{message}</p>
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
            Yes
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
            No
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
