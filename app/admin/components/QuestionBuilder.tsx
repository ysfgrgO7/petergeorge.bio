"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  getDocs,
  DocumentData,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import styles from "../admin.module.css";
import Modal, { ModalVariant } from "@/app/components/Modal";
import { onAuthStateChanged } from "firebase/auth";
import {
  IoCloseCircleSharp,
  IoAdd,
  IoTrashSharp,
  IoPencilSharp,
  IoSaveSharp,
  IoCloseSharp,
} from "react-icons/io5";
import Loading from "@/app/components/Loading";
import {
  MdFormatUnderlined,
  MdFormatBold,
  MdFormatItalic,
} from "react-icons/md";

// Rich Text Editor Component
const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Enter your question here...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const toggleWrap = (tag: "b" | "i" | "u") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === null || end === null) return;

    const selectedText = value.substring(start, end);
    const startTag = `<${tag}>`;
    const endTag = `</${tag}>`;

    const beforeSelection = value.substring(0, start);
    const afterSelection = value.substring(end);

    const isWrappedBefore =
      start >= startTag.length &&
      beforeSelection.substring(start - startTag.length, start) === startTag;
    const isWrappedAfter =
      afterSelection.substring(0, endTag.length) === endTag;

    if (selectedText && isWrappedBefore && isWrappedAfter) {
      const newBefore = beforeSelection.slice(0, -startTag.length);
      const newAfter = afterSelection.slice(endTag.length);
      const newValue = newBefore + selectedText + newAfter;
      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        const newStart = start - startTag.length;
        const newEnd = end - startTag.length;
        textarea.setSelectionRange(newStart, newEnd);
      }, 0);
      return;
    }

    if (selectedText) {
      const newValue =
        beforeSelection + startTag + selectedText + endTag + afterSelection;
      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        const newStart = start + startTag.length;
        const newEnd = end + startTag.length;
        textarea.setSelectionRange(newStart, newEnd);
      }, 0);
    }
  };

  const renderPreview = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/<b>(.*?)<\/b>/g, "<b>$1</b>")
      .replace(/<i>(.*?)<\/i>/g, "<i>$1</i>")
      .replace(/<u>(.*?)<\/u>/g, "<u>$1</u>");
  };

  return (
    <div style={{ marginBottom: "16px" }}>
      {value && (
        <>
          <strong>Preview:</strong>
          <div
            style={{
              marginTop: "8px",
              padding: "8px",
              border: "1px dashed var(--fg)",
              borderRadius: "var(--border-radius)",
              backgroundColor: "transparent",
              fontSize: "14px",
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: renderPreview(value) }} />
          </div>
        </>
      )}
      <br />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          flexDirection: "column",
        }}
      >
        <textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            resize: "vertical",
            fontFamily: "monospace",
            fontSize: "14px",
            borderBottomLeftRadius: "0",
            borderBottomRightRadius: "0",
          }}
        />

        <div
          style={{
            display: "flex",
            backgroundColor: "var(--white)",
            width: "100%",
            borderBottomLeftRadius: "var(--border-radius)",
            borderBottomRightRadius: "var(--border-radius)",
          }}
        >
          <button
            type="button"
            onClick={() => toggleWrap("u")}
            title="Underline selected text"
            style={{ backgroundColor: "transparent", color: "var(--black)" }}
          >
            <MdFormatUnderlined style={{ fontSize: "1.5rem" }} />
          </button>

          <button
            type="button"
            onClick={() => toggleWrap("b")}
            title="Bold selected text"
            style={{ backgroundColor: "transparent", color: "var(--black)" }}
          >
            <MdFormatBold style={{ fontSize: "1.5rem" }} />
          </button>

          <button
            type="button"
            onClick={() => toggleWrap("i")}
            title="Italic selected text"
            style={{ backgroundColor: "transparent", color: "var(--black)" }}
          >
            <MdFormatItalic style={{ fontSize: "1.5rem" }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export interface ExistingQuestion extends DocumentData {
  id: string;
  question: string;
  options?: string[];
  correctAnswerIndex?: number;
  imageUrl?: string;
  marks?: number;
  type?: string;
}

export interface QuestionData {
  type: "mcq" | "essay";
  question: string;
  options?: string[];
  correctAnswerIndex?: number | null;
  imageUrl?: string | null;
  marks: number;
}

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

export interface QuestionBuilderProps {
  builderType: "quiz" | "homework";
  year: string;
  courseId: string;
  lectureId: string;
}

export default function QuestionBuilder({
  builderType,
  year,
  courseId,
  lectureId,
}: QuestionBuilderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // State
  const [existingMcqs, setExistingMcqs] = useState<ExistingQuestion[]>([]);
  const [existingEssays, setExistingEssays] = useState<ExistingQuestion[]>([]);
  const [showAddMcq, setShowAddMcq] = useState(false);
  const [showAddEssay, setShowAddEssay] = useState(false);

  // Duration state (Quiz specific)
  const [quizDurationInput, setQuizDurationInput] = useState<number | "">("");
  const [currentQuizDuration, setCurrentQuizDuration] = useState<number | null>(
    null,
  );
  const [isDurationLoading, setIsDurationLoading] = useState(true);

  // UI state
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalVariant, setModalVariant] = useState<ModalVariant>("success");
  const [activeTab, setActiveTab] = useState<
    "variant1" | "variant2" | "variant3"
  >("variant1");
  const [isCopying, setIsCopying] = useState(false);

  // Duration logic
  const fetchQuizDuration = useCallback(async () => {
    if (builderType !== "quiz") {
      setIsDurationLoading(false);
      return;
    }
    if (!year || !courseId || !lectureId) {
      setIsDurationLoading(false);
      return;
    }
    setIsDurationLoading(true);
    try {
      const settingsDocRef = doc(
        db,
        `years/${year}/courses/${courseId}/lectures/${lectureId}/quizSettings/duration`,
      );
      const docSnap = await getDoc(settingsDocRef);
      if (docSnap.exists()) {
        setCurrentQuizDuration(docSnap.data().duration || null);
      } else {
        setCurrentQuizDuration(null);
      }
    } catch (error) {
      console.error("Error fetching quiz duration:", error);
      setModalMessage("Failed to load quiz duration.");
      setModalVariant("error");
      setShowModal(true);
      setCurrentQuizDuration(null);
    } finally {
      setIsDurationLoading(false);
    }
  }, [year, courseId, lectureId, builderType]);

  const saveQuizDuration = async () => {
    if (builderType !== "quiz") return;
    const durationValue = Number(quizDurationInput);
    if (
      quizDurationInput === "" ||
      isNaN(durationValue) ||
      durationValue <= 0
    ) {
      setModalMessage(
        "Please enter a valid positive number for quiz duration.",
      );
      setModalVariant("warning");
      setShowModal(true);
      return;
    }
    if (!year || !courseId || !lectureId) {
      setModalMessage(
        "Missing course, lecture, or year information to save duration.",
      );
      setModalVariant("warning");
      setShowModal(true);
      return;
    }
    try {
      const settingsDocRef = doc(
        db,
        `years/${year}/courses/${courseId}/lectures/${lectureId}/quizSettings/duration`,
      );
      await setDoc(settingsDocRef, { duration: durationValue });
      setCurrentQuizDuration(durationValue);
      setQuizDurationInput("");
      setModalMessage("Quiz duration saved successfully! 🎉");
      setModalVariant("success");
      setShowModal(true);
    } catch (error: unknown) {
      console.error("Error saving quiz duration:", error);
      setModalMessage(
        "Failed to save quiz duration: " + (error as Error).message,
      );
      setModalVariant("error");
      setShowModal(true);
    }
  };

  // Fetch questions
  const fetchQuestions = useCallback(
    async (tab: "variant1" | "variant2" | "variant3") => {
      if (!year || !courseId || !lectureId) return;

      if (builderType === "homework") {
        const homeworkCollectionPath = `years/${year}/courses/${courseId}/lectures/${lectureId}/homeworkQuestions`;
        try {
          const hwRef = collection(db, homeworkCollectionPath);
          const hwSnap = await getDocs(hwRef);
          const hwData = hwSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as ExistingQuestion[];

          const mcqs = hwData.filter((q) => q.type === "mcq" || !q.type);
          const essays = hwData.filter((q) => q.type === "essay");

          setExistingMcqs(mcqs);
          setExistingEssays(essays);
        } catch (error) {
          console.error("Error fetching homework:", error);
          setModalMessage("Failed to fetch existing homework questions.");
          setModalVariant("error");
          setShowModal(true);
        }
      } else {
        // Quiz variant logic
        let mcqCollectionPath = `years/${year}/courses/${courseId}/lectures/${lectureId}/${tab}Quizzes`;
        const essayCollectionPath = `years/${year}/courses/${courseId}/lectures/${lectureId}/essayQuestions`;

        try {
          const mcqQuestionsRef = collection(db, mcqCollectionPath);
          const mcqSnapshot = await getDocs(mcqQuestionsRef);
          const mcqs = mcqSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as ExistingQuestion[];
          setExistingMcqs(mcqs);

          const essayRef = collection(db, essayCollectionPath);
          const essaySnap = await getDocs(essayRef);
          const essays = essaySnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as ExistingQuestion[];
          setExistingEssays(essays);
        } catch (error) {
          console.error("Error fetching quizzes:", error);
          setModalMessage("Failed to fetch existing quizzes.");
          setModalVariant("error");
          setShowModal(true);
        }
      }
    },
    [year, courseId, lectureId, builderType],
  );

  const copyToAllVariants = async () => {
    if (builderType !== "quiz") return;
    if (!year || !courseId || !lectureId) {
      setModalMessage("Missing course, lecture, or year information.");
      setModalVariant("warning");
      setShowModal(true);
      return;
    }

    if (existingMcqs.length === 0) {
      setModalMessage(
        `No MCQ questions found in ${activeTab.replace("variant", "Variant ")} to copy.`,
      );
      setModalVariant("warning");
      setShowModal(true);
      return;
    }

    const confirmCopy = window.confirm(
      `Are you sure you want to copy all ${existingMcqs.length} MCQ questions from ${activeTab.replace(
        "variant",
        "Variant ",
      )} to all other variants? This will replace existing questions in the other variants.`,
    );

    if (!confirmCopy) return;
    setIsCopying(true);

    try {
      const batch = writeBatch(db);
      const variants = ["variant1", "variant2", "variant3"];
      const targetVariants = variants.filter((v) => v !== activeTab);

      for (const variant of targetVariants) {
        const collectionPath = `years/${year}/courses/${courseId}/lectures/${lectureId}/${variant}Quizzes`;
        const existingDocs = await getDocs(collection(db, collectionPath));
        existingDocs.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
      }

      for (const variant of targetVariants) {
        const collectionPath = `years/${year}/courses/${courseId}/lectures/${lectureId}/${variant}Quizzes`;
        existingMcqs.forEach((quiz) => {
          const newDocRef = doc(collection(db, collectionPath));
          const quizData = {
            type: quiz.type || "mcq",
            question: quiz.question,
            options: quiz.options,
            correctAnswerIndex: quiz.correctAnswerIndex,
            imageUrl: quiz.imageUrl,
            marks: quiz.marks || 1,
          };
          batch.set(newDocRef, quizData);
        });
      }

      await batch.commit();

      setModalMessage(
        `Successfully copied ${existingMcqs.length} MCQ questions from ${activeTab.replace(
          "variant",
          "Variant ",
        )} to all other variants! 🎉`,
      );
      setModalVariant("success");
      setShowModal(true);
    } catch (error: unknown) {
      console.error("Error copying to all variants:", error);
      setModalMessage(
        "Failed to copy questions to all variants: " + (error as Error).message,
      );
      setModalVariant("error");
      setShowModal(true);
    } finally {
      setIsCopying(false);
    }
  };

  const getCollectionPath = (quizType: "mcq" | "essay") => {
    if (builderType === "homework") {
      return `years/${year}/courses/${courseId}/lectures/${lectureId}/homeworkQuestions`;
    } else {
      return quizType === "mcq"
        ? `years/${year}/courses/${courseId}/lectures/${lectureId}/${activeTab}Quizzes`
        : `years/${year}/courses/${courseId}/lectures/${lectureId}/essayQuestions`;
    }
  };

  const handleDelete = async (quizType: "mcq" | "essay", id: string) => {
    if (!year || !courseId || !lectureId) return;

    if (!window.confirm(`Are you sure you want to delete this ${quizType}?`)) {
      return;
    }

    const collectionPath = getCollectionPath(quizType);
    const docRef = doc(db, collectionPath, id);
    try {
      await deleteDoc(docRef);
      setModalMessage(`${quizType.toUpperCase()} deleted successfully! 🗑️`);
      setModalVariant("success");
      setShowModal(true);
      fetchQuestions(activeTab);
    } catch (error) {
      console.error(`Error deleting ${quizType}:`, error);
      setModalMessage(`Failed to delete ${quizType}.`);
      setModalVariant("error");
      setShowModal(true);
    }
  };

  const handleSave = async (id: string, data: QuestionData) => {
    if (builderType === "quiz" && currentQuizDuration === null) {
      setModalMessage("Please set the overall quiz duration first.");
      setModalVariant("warning");
      setShowModal(true);
      return;
    }
    if (!year || !courseId || !lectureId) return;

    try {
      const collectionPath = getCollectionPath(data.type);
      await updateDoc(doc(db, collectionPath, id), { ...data });
      setModalMessage(`${data.type.toUpperCase()} updated successfully! ✅`);
      setModalVariant("success");
      setShowModal(true);
      fetchQuestions(activeTab);
    } catch (error: unknown) {
      console.error(`Error updating ${data.type}:`, error);
      setModalMessage(
        `Failed to save ${data.type}: ` + (error as Error).message,
      );
      setModalVariant("error");
      setShowModal(true);
    }
  };

  const handleSubmit = async (
    quizType: "mcq" | "essay",
    data: QuestionData,
  ) => {
    if (builderType === "quiz" && currentQuizDuration === null) {
      setModalMessage("Please set the overall quiz duration first.");
      setModalVariant("warning");
      setShowModal(true);
      return;
    }
    if (!year || !courseId || !lectureId) return;

    try {
      const collectionPath = getCollectionPath(quizType);
      await addDoc(collection(db, collectionPath), data);
      setModalMessage(`${quizType.toUpperCase()} saved successfully! ✅`);
      if (quizType === "mcq") setShowAddMcq(false);
      else setShowAddEssay(false);

      setModalVariant("success");
      setShowModal(true);
      fetchQuestions(activeTab);
    } catch (error: unknown) {
      console.error(`Error adding ${quizType}:`, error);
      setModalMessage(
        `Failed to save ${quizType}: ` + (error as Error).message,
      );
      setModalVariant("error");
      setShowModal(true);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.email) {
          const adminDocRef = doc(db, "admins", user.email);
          const adminDocSnap = await getDoc(adminDocRef);

          if (adminDocSnap.exists()) {
            setIsAdmin(true);
          } else {
            router.push("/");
          }
        } else {
          router.push("/");
        }
      } else {
        router.push("/");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    fetchQuizDuration();
    if (year && courseId && lectureId) {
      fetchQuestions(activeTab);
    }
  }, [year, courseId, lectureId, activeTab, fetchQuizDuration, fetchQuestions]);

  useEffect(() => {
    setShowAddMcq(false);
    setShowAddEssay(false);
  }, [activeTab]);

  if (!year || !courseId || !lectureId) {
    return (
      <div className="wrapper">
        <p>Missing year, course, or lecture info in URL.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="wrapper">
        <Loading text="Loading..." />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={styles.wrapper}>
        <p>Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <h1>{builderType === "quiz" ? "Quiz Builder" : "Homework Builder"}</h1>
      <p style={{ marginBottom: "20px", fontSize: "14px" }}>
        <strong>Year:</strong> {year.toUpperCase()} |{" "}
        <strong>Course ID:</strong> {courseId} | <strong>Lecture ID:</strong>{" "}
        {lectureId}
      </p>

      {builderType === "quiz" && (
        <div className={styles.durationCard}>
          <h2 style={{ fontWeight: "400" }}>Quiz Duration</h2>
          {isDurationLoading ? (
            <Loading text="Loading..." />
          ) : currentQuizDuration === null ? (
            <div className={styles.durationControls}>
              <input
                type="number"
                placeholder="Set Quiz Duration (minutes)"
                value={quizDurationInput}
                onChange={(e) =>
                  setQuizDurationInput(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                min="1"
                className={styles.durationInput}
              />
              <button
                onClick={saveQuizDuration}
                className={styles.setDurationBtn}
              >
                Set Duration
              </button>
            </div>
          ) : (
            <div className={styles.durationControls}>
              <p>
                Current Duration: <strong>{currentQuizDuration} minutes</strong>
              </p>
              <input
                type="number"
                placeholder="New Duration (minutes)"
                value={quizDurationInput}
                onChange={(e) =>
                  setQuizDurationInput(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                min="1"
              />
              <button onClick={saveQuizDuration}>Update Duration</button>
            </div>
          )}
        </div>
      )}

      {builderType === "quiz" && (
        <div className={styles.tabs}>
          <button
            className={activeTab === "variant1" ? styles.activeTab : ""}
            onClick={() => setActiveTab("variant1")}
          >
            Variant 1
          </button>
          <button
            className={activeTab === "variant2" ? styles.activeTab : ""}
            onClick={() => setActiveTab("variant2")}
          >
            Variant 2
          </button>
          <button
            className={activeTab === "variant3" ? styles.activeTab : ""}
            onClick={() => setActiveTab("variant3")}
          >
            Variant 3
          </button>
        </div>
      )}

      <div>
        <div className={styles.sectionHeader}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "400" }}>
            {builderType === "quiz"
              ? activeTab.replace("variant", "Variant ") + " Questions"
              : "Questions"}
          </h2>
          {builderType === "quiz" && existingMcqs.length > 0 && (
            <button
              onClick={copyToAllVariants}
              disabled={isCopying}
              className={styles.copyAllBtn}
            >
              {isCopying ? "🔄 Copying..." : "📋 Copy to All Variants"}
            </button>
          )}
        </div>

        <div className={styles.addQuestionButtons}>
          <button
            onClick={() => {
              setShowAddMcq(!showAddMcq);
              setShowAddEssay(false);
            }}
            className={`${styles.addBtn} ${showAddMcq ? styles.active : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IoAdd style={{ fontSize: "1rem" }} />
            Add Multiple Choice Question
          </button>
          <button
            onClick={() => {
              setShowAddEssay(!showAddEssay);
              setShowAddMcq(false);
            }}
            className={`${styles.addBtn} ${showAddEssay ? styles.active : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IoAdd style={{ fontSize: "1rem" }} />
            Add Essay Question
          </button>
        </div>

        {showAddMcq && (
          <AddQuestionCard
            type="mcq"
            onSubmit={(data) => handleSubmit("mcq", data)}
            onCancel={() => setShowAddMcq(false)}
          />
        )}

        {showAddEssay && (
          <AddQuestionCard
            type="essay"
            onSubmit={(data) => handleSubmit("essay", data)}
            onCancel={() => setShowAddEssay(false)}
          />
        )}

        <div>
          {existingMcqs.length > 0 && (
            <>
              <h2>Multiple Choice Questions ({existingMcqs.length})</h2>
              <div className={styles.questionsList}>
                {existingMcqs.map((q, index) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={index}
                    onSave={handleSave}
                    onDelete={(id) => handleDelete("mcq", id)}
                    type="mcq"
                  />
                ))}
              </div>
            </>
          )}

          {existingEssays.length > 0 && (
            <div
              style={{
                marginBottom: "32px",
                marginTop: existingMcqs.length > 0 ? "32px" : "0",
              }}
            >
              <h3>
                Essay Questions ({existingEssays.length}){" "}
                {builderType === "quiz" && "- Shared across all variants"}
              </h3>
              <div className={styles.questionsList}>
                {existingEssays.map((q, index) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={index}
                    onSave={handleSave}
                    onDelete={(id) => handleDelete("essay", id)}
                    type="essay"
                  />
                ))}
              </div>
            </div>
          )}

          {existingMcqs.length === 0 && existingEssays.length === 0 && (
            <div className={styles.emptyState}>
              <p>
                No questions yet. Add your first question using the buttons
                above!
              </p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <Modal
          isOpen={showModal}
          type="toast"
          variant={modalVariant}
          message={modalMessage}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
