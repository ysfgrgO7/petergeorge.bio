"use client";

import React, { useState } from "react";
import styles from "../admin.module.css";
import RichTextEditor from "./RichTextEditor";
import {
  IoCloseCircleSharp,
  IoAdd,
  IoTrashSharp,
  IoPencilSharp,
  IoSaveSharp,
  IoCloseSharp,
} from "react-icons/io5";
import { ExistingQuestion, QuestionData } from "./QuestionBuilder";

const QuestionCard = ({
  question,
  index,
  onSave,
  onDelete,
  type = "mcq",
}: {
  question: ExistingQuestion;
  index: number;
  onSave: (id: string, data: QuestionData) => void;
  onDelete: (id: string, type: "mcq" | "essay") => void;
  type?: "mcq" | "essay";
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editQuestion, setEditQuestion] = useState(question.question);
  const [editImageUrl, setEditImageUrl] = useState(question.imageUrl || "");
  const [editMarks, setEditMarks] = useState<number>(question.marks || 1);
  const [editOptions, setEditOptions] = useState(question.options || ["", ""]);
  const [editCorrectAnswerIndex, setEditCorrectAnswerIndex] = useState<
    number | null
  >(question.correctAnswerIndex ?? null);

  const handleEdit = () => {
    setIsEditing(true);
    setEditQuestion(question.question);
    setEditImageUrl(question.imageUrl || "");
    setEditMarks(question.marks || 1);
    setEditOptions(question.options || ["", ""]);
    setEditCorrectAnswerIndex(question.correctAnswerIndex ?? null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditQuestion(question.question);
    setEditImageUrl(question.imageUrl || "");
    setEditMarks(question.marks || 1);
    setEditOptions(question.options || ["", ""]);
    setEditCorrectAnswerIndex(question.correctAnswerIndex ?? null);
  };

  const handleSave = () => {
    if (type === "mcq") {
      if (
        !editQuestion.trim() ||
        editOptions.some((opt: string) => !opt.trim()) ||
        editCorrectAnswerIndex === null
      ) {
        alert("Please complete all MCQ fields and select a correct answer.");
        return;
      }
      onSave(question.id, {
        type: "mcq",
        question: editQuestion,
        options: editOptions,
        correctAnswerIndex: editCorrectAnswerIndex,
        imageUrl: editImageUrl.trim() || null,
        marks: editMarks,
      });
    } else {
      if (!editQuestion.trim()) {
        alert("Please enter an essay question.");
        return;
      }
      onSave(question.id, {
        type: "essay",
        question: editQuestion,
        imageUrl: editImageUrl.trim() || null,
        marks: editMarks,
      });
    }
    setIsEditing(false);
  };

  const addOption = () => {
    if (editOptions.length < 5) setEditOptions([...editOptions, ""]);
  };

  const removeOption = (optIndex: number) => {
    if (editOptions.length > 2) {
      setEditOptions(
        editOptions.filter((_: string, i: number) => i !== optIndex),
      );
      if (editCorrectAnswerIndex === optIndex) {
        setEditCorrectAnswerIndex(null);
      } else if (
        editCorrectAnswerIndex !== null &&
        editCorrectAnswerIndex > optIndex
      ) {
        setEditCorrectAnswerIndex(editCorrectAnswerIndex - 1);
      }
    }
  };

  const handleOptionChange = (optIndex: number, value: string) => {
    const updated = [...editOptions];
    updated[optIndex] = value;
    setEditOptions(updated);
  };

  return (
    <div className={styles.questionCard}>
      <div className={styles.questionHeader}>
        <div className={styles.questionNumber}>Question {index + 1}</div>
        <div className={styles.questionActions}>
          {isEditing ? (
            <>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                title="Save changes"
              >
                <IoSaveSharp />
              </button>
              <button
                className={styles.cancelBtn}
                onClick={handleCancel}
                title="Cancel editing"
              >
                <IoCloseSharp />
              </button>
            </>
          ) : (
            <>
              <button
                className={styles.editBtn}
                onClick={handleEdit}
                title="Edit question"
              >
                <IoPencilSharp />
              </button>
              <button
                className={styles.deleteBtn}
                onClick={() => onDelete(question.id, type)}
                title="Delete question"
              >
                <IoTrashSharp />
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.questionContent}>
        {isEditing ? (
          <div>
            <RichTextEditor
              value={editQuestion}
              onChange={setEditQuestion}
              placeholder="Enter your question here..."
            />

            <div style={{ marginBottom: "16px" }}>
              <label>Image URL (optional)</label>
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label>Points</label>
              <input
                type="number"
                placeholder="Marks"
                min={1}
                value={editMarks}
                onChange={(e) => setEditMarks(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {type === "mcq" && (
              <div style={{ marginBottom: "16px" }}>
                <label>Answer Options</label>
                {editOptions.map((opt: string, idx: number) => (
                  <div
                    key={idx}
                    className={styles.optionRow}
                    style={{ marginBottom: "8px" }}
                  >
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
                        name={`correct-${question.id}`}
                        checked={editCorrectAnswerIndex === idx}
                        onChange={() => setEditCorrectAnswerIndex(idx)}
                      />
                      <span>Correct</span>
                    </label>
                    {editOptions.length > 2 && (
                      <button
                        style={{
                          backgroundColor: "transparent",
                          border: "none",
                          marginLeft: "8px",
                        }}
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

                {editOptions.length < 5 && (
                  <button
                    onClick={addOption}
                    type="button"
                    className={styles.addOptionBtn}
                    style={{ marginTop: "8px" }}
                  >
                    <IoAdd style={{ fontSize: "1.2rem" }} />
                    Add Option
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div
              className={styles.questionText}
              dangerouslySetInnerHTML={{
                __html: question.question.replace(
                  /<u>(.*?)<\/u>/g,
                  "<u>$1</u>",
                ),
              }}
            />

            {question.imageUrl && (
              <div style={{ margin: "16px 0" }}>
                <img
                  src={question.imageUrl}
                  alt={`Question ${index + 1}`}
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: "8px",
                  }}
                />
              </div>
            )}

            {type === "mcq" &&
              question.options &&
              question.options.length > 0 && (
                <div style={{ margin: "16px 0" }}>
                  {question.options.map((option: string, optIndex: number) => (
                    <div
                      key={optIndex}
                      className={`${styles.optionItem} ${
                        optIndex === question.correctAnswerIndex
                          ? styles.correctOption
                          : ""
                      }`}
                    >
                      <span className={styles.optionLetter}>
                        {String.fromCharCode(65 + optIndex)}.
                      </span>
                      <span style={{ flex: "1" }}>{option}</span>
                      {optIndex === question.correctAnswerIndex && (
                        <span className={styles.correctMark}>✓</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

            <div className={styles.questionFooter}>
              <span className={styles.questionType}>
                {type === "mcq" ? "Multiple Choice" : "Essay"}
              </span>
              <span className={styles.questionMarks}>
                {question.marks || 1} {question.marks === 1 ? "Mark" : "Marks"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionCard;
