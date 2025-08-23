// admin/MessageModal.tsx
import React, { useEffect, useState } from "react";

interface MessageModalProps {
  message: string;
  onClose: () => void;
}

const MessageModal: React.FC<MessageModalProps> = ({ message, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Auto-close after 3s
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 800); // wait for animation to finish
    }, 8000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        zIndex: 1000,
      }}
    >
      <div
        className={`toast ${visible ? "toast-show" : "toast-hide"}`}
        style={{
          backgroundColor: "var(--green)",
          color: "var(--white)",
          padding: "12px 16px",
          borderRadius: "var(--border-radius)",
          boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
          minWidth: "200px",
        }}
      >
        <p style={{ margin: 0 }}>{message}</p>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 300);
          }}
          style={{
            marginTop: "8px",
            backgroundColor: "var(--black)",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          OK
        </button>
      </div>

      <style jsx>{`
        .toast {
          transition: all 0.3s ease-in-out;
          opacity: 0;
          transform: translateX(100%);
        }
        .toast-show {
          opacity: 1;
          transform: translateX(0);
        }
        .toast-hide {
          opacity: 0;
          transform: translateX(100%);
        }
      `}</style>
    </div>
  );
};

export default MessageModal;
