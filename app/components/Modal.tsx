"use client";

import React, { useEffect, useState } from "react";
import {
  MdCheckCircle,
  MdError,
  MdInfo,
  MdWarning,
  MdClose,
} from "react-icons/md";

export type ModalType = "toast" | "popup";
export type ModalVariant = "success" | "error" | "info" | "warning";

interface ModalProps {
  isOpen: boolean;
  type?: ModalType;
  variant?: ModalVariant;
  message: string;
  title?: string;
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  autoCloseMs?: number;
  children?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  type = "popup",
  variant = "info",
  message,
  title,
  onClose,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  autoCloseMs = 5000,
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (type === "toast" && autoCloseMs > 0) {
        const timer = setTimeout(() => handleClose(), autoCloseMs);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [isOpen, type, autoCloseMs]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onCancel) onCancel();
      else if (onClose) onClose();
    }, 300);
  };

  if (!isOpen && !isVisible) return null;

  const variantMap = {
    success: { icon: <MdCheckCircle />, color: "var(--green)" },
    error: { icon: <MdError />, color: "var(--red)" },
    info: { icon: <MdInfo />, color: "var(--blue)" },
    warning: { icon: <MdWarning />, color: "var(--yellow)" },
  };

  const { icon, color } = variantMap[variant];

  // Common button class to avoid solid background on hover
  const ghostButtonClass = "transition-all active:scale-95 hover:opacity-80";

  // --- Toast Layout ---
  if (type === "toast") {
    return (
      <div
        className={
          isVisible ? "animate-slide-in-right" : "animate-slide-out-right"
        }
        style={{
          position: "fixed",
          top: "1.5rem",
          right: "1.5rem",
          zIndex: 9999,
          minWidth: "300px",
          maxWidth: "400px",
          backdropFilter: "blur(4px)",
        }}
      >
        <div
          className="card"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "center",
            justifyItems: "center",
            gap: "1rem",
            padding: "1rem",
            borderLeft: `4px solid ${color}`,
          }}
        >
          <div style={{ fontSize: "1.5rem", color }}>{icon}</div>
          <div style={{ flex: 1 }}>
            {title && (
              <h4
                style={{
                  fontWeight: "bold",
                  fontSize: "0.9rem",
                  marginBottom: "0.25rem",
                  marginTop: 0,
                }}
              >
                {title}
              </h4>
            )}
            <p style={{ fontSize: "0.9rem", opacity: 0.9, margin: 0 }}>
              {message}
            </p>
          </div>
          <button
            onClick={handleClose}
            className={ghostButtonClass}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "inherit",
            }}
          >
            <MdClose size={20} />
          </button>
        </div>
      </div>
    );
  }

  // --- Popup Layout ---
  return (
    <div
      className={isVisible ? "animate-fade-in" : "animate-fade-out"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className={`card ${isVisible ? "animate-modal-scale" : "animate-modal-scale-out"}`}
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "3.5rem", color, marginBottom: "1rem" }}>
          {icon}
        </div>

        {title && (
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "bold",
              marginBottom: "0.5rem",
            }}
          >
            {title}
          </h3>
        )}
        <p style={{ fontSize: "1rem", opacity: 0.8, marginBottom: "1.5rem" }}>
          {message}
        </p>

        {children && (
          <div style={{ width: "100%", marginBottom: "1.5rem" }}>
            {children}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "1rem",
            width: "100%",
            justifyContent: "center",
          }}
        >
          {onConfirm ? (
            <>
              <button
                onClick={handleCancel}
                className={ghostButtonClass}
                style={{
                  flex: 1,
                  padding: "0.6rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid currentColor",
                  background: "transparent",
                }}
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  setIsVisible(false);
                }}
                className={ghostButtonClass}
                style={{
                  flex: 1,
                  padding: "0.6rem 1rem",
                  borderRadius: "8px",
                  backgroundColor: color,
                  color: "white",
                  border: "none",
                  fontWeight: "bold",
                }}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              className={ghostButtonClass}
              style={{
                padding: "0.6rem 2.5rem",
                borderRadius: "8px",
                backgroundColor: color,
                color: "white",
                border: "none",
                fontWeight: "bold",
              }}
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
