"use client";

import React, { useState } from "react";
import styles from "../admin.module.css";
import RichTextEditor from "./RichTextEditor";
import { IoCloseCircleSharp, IoAdd } from "react-icons/io5";
import { QuestionData } from "./QuestionBuilder";

const AddQuestionCard = ({
  type,
  onSubmit,
  onCancel,
}: {
  type: "mcq" | "essay";
  onSubmit: (data: QuestionData) => void;
  onCancel?: () => void;
}) => {
  const [question, setQuestion] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [marks, setMarks] = useState<number>(1);
  const [options, setOptions] = useState(["", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(
    null,
  );

  const addOption = () => {
    if (options.length < 5) setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_: string, i: number) => i !== index));
      if (correctAnswerIndex === index) {
        setCorrectAnswerIndex(null);
      } else if (correctAnswerIndex !== null && correctAnswerIndex > index) {
        setCorrectAnswerIndex(correctAnswerIndex - 1);
      }
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = () => {
    if (type === "mcq") {
      if (
        !question.trim() ||
        options.some((opt: string) => !opt.trim()) ||
        correctAnswerIndex === null
      ) {
        alert("Please complete all MCQ fields and select a correct answer.");
        return;
      }
      onSubmit({
        type: "mcq",
        question,
        options,
        correctAnswerIndex,
        imageUrl: imageUrl.trim() || null,
        marks,
      });
    } else {
      if (!question.trim()) {
        alert("Please enter an essay question.");
        return;
      }
      onSubmit({
        type: "essay",
        question,
        imageUrl: imageUrl.trim() || null,
        marks,
      });
    }

    setQuestion("");
    setImageUrl("");
    setMarks(1);
    setOptions(["", ""]);
    setCorrectAnswerIndex(null);
  };

  return (
    <div className={styles.questionCard}>
      <h3>Add New {type.toUpperCase()}</h3>

      <RichTextEditor
        value={question}
        onChange={setQuestion}
        placeholder="Enter your question here..."
      />

      <div style={{ marginBottom: "20px" }}>
        <label>Image URL (optional)</label>
        <input
          type="url"
          placeholder="https://example.com/image.jpg"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Points</label>
        <input
          type="number"
          placeholder="Marks"
          min={1}
          value={marks}
          onChange={(e) => setMarks(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>

      {type === "mcq" && (
        <div className={styles.formGroup}>
          <label>Answer Options</label>
          {options.map((opt: string, idx: number) => (
            <div key={idx} className={styles.optionRow}>
              <span className={styles.optionLabel}>
                {String.fromCharCode(65 + idx)}.
              </span>
              <input
                type="text"
                placeholder={`Option ${idx + 1}`}
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                style={{ flex: 1 }}
              />
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="correct"
                  checked={correctAnswerIndex === idx}
                  onChange={() => setCorrectAnswerIndex(idx)}
                />
                <span>Correct</span>
              </label>
              {options.length > 2 && (
                <button
                  style={{ backgroundColor: "transparent" }}
                  onClick={() => removeOption(idx)}
                  type="button"
                >
                  <IoCloseCircleSharp
                    style={{
                      color: "var(--red)",
                      fontSize: "1.5rem",
                    }}
                  />
                </button>
              )}
            </div>
          ))}

          {options.length < 5 && (
            <button
              onClick={addOption}
              type="button"
              className={styles.addOptionBtn}
            >
              <IoAdd style={{ fontSize: "1.2rem" }} />
              Add Option
            </button>
          )}
        </div>
      )}

      <div className={styles.cardActions}>
        <button onClick={handleSubmit}>Save Question</button>
        {onCancel && <button onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
};

export default AddQuestionCard;
