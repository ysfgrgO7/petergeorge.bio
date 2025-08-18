// admin/MessageModal.tsx
import React from "react";

interface MessageModalProps {
  message: string;
  onClose: () => void;
}

const MessageModal: React.FC<MessageModalProps> = ({ message, onClose }) => {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "transparent",
        height: "min-content",
        width: "fit-content",
        border: "10px solid transparent",
        right: 0,
      }}
    >
      <div
        style={{
          backgroundColor: "var(--green)",
          color: "var(--white)",
          padding: "10px",
          borderRadius: "var(--border-radius)",
          right: 0,
        }}
      >
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
            <p className="text-lg font-semibold mb-4">{message}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              style={{ backgroundColor: "var(--black)" }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;
