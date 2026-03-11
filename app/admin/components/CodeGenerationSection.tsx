import React from "react";
import styles from "../admin.module.css";
import { ModalVariant } from "@/app/components/Modal";

interface CodeGenerationSectionProps {
  handleGenerateUniversalCode: () => void;
  generatedCode: string;
  setModalMessage: (msg: string) => void;
  setModalVariant: (variant: ModalVariant) => void;
  setShowModal: (show: boolean) => void;
}

export default function CodeGenerationSection({
  handleGenerateUniversalCode,
  generatedCode,
  setModalMessage,
  setModalVariant,
  setShowModal,
}: CodeGenerationSectionProps) {
  return (
    <section>
      <h2>Generate Code</h2>
      <p>This code will unlock a single, locked lecture for one user.</p>
      <div
        className={styles.form}
        style={{ flexDirection: "row", gap: "1rem", alignItems: "center" }}
      >
        <button onClick={handleGenerateUniversalCode}>Generate Code</button>
        <input
          type="text"
          readOnly
          value={generatedCode}
          placeholder="Generated code will appear here"
          className={styles.generatedCodeInput}
        />
        <button
          onClick={() => {
            if (generatedCode) {
              navigator.clipboard.writeText(generatedCode);
            }

            setModalMessage(`Code copied to clipboard!`);
            setModalVariant("info");
            setShowModal(true);
          }}
        >
          Copy
        </button>
      </div>
    </section>
  );
}
