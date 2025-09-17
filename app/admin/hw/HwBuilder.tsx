"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection,
  addDoc,
  getDocs,
  DocumentData,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import styles from "../admin.module.css";
import MessageModal from "@/app/MessageModal";
import { onAuthStateChanged } from "firebase/auth";

// Interfaces
interface ExistingHomework extends DocumentData {
  id: string;
  question: string;
  options?: string[];
  correctAnswerIndex?: number;
  imageUrl?: string;
  marks?: number;
  type: "mcq" | "essay";
}

export default function HomeworkBuilder() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const year = searchParams.get("year");
  const courseId = searchParams.get("courseId");
  const lectureId = searchParams.get("lectureId");

  // --- Homework content state ---
  const [mcqQuestion, setMcqQuestion] = useState("");
  const [mcqImageUrl, setMcqImageUrl] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(
    null
  );

  const [essayQuestion, setEssayQuestion] = useState("");
  const [essayImageUrl, setEssayImageUrl] = useState("");

  const [existingHomework, setExistingHomework] = useState<ExistingHomework[]>(
    []
  );
  const [editingHomework, setEditingHomework] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<"mcq" | "essay" | null>(null);

  // --- UI state ---
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // --- Fetch homework questions ---
  const fetchHomework = async () => {
    if (!year || !courseId || !lectureId) return;

    const homeworkCollectionPath = `years/${year}/courses/${courseId}/lectures/${lectureId}/homeworkQuestions`;

    try {
      const homeworkRef = collection(db, homeworkCollectionPath);
      const homeworkSnapshot = await getDocs(homeworkRef);
      const homework = homeworkSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ExistingHomework[];

      // Sort by creation order or any other criteria you prefer
      setExistingHomework(homework);
    } catch (error) {
      console.error("Error fetching homework:", error);
      setModalMessage("Failed to fetch existing homework questions.");
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
    fetchHomework();
  }, [year, courseId, lectureId]);

  // --- Options handlers ---
  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
    if (correctAnswerIndex === index) {
      setCorrectAnswerIndex(null);
    } else if (correctAnswerIndex !== null && correctAnswerIndex > index) {
      setCorrectAnswerIndex(correctAnswerIndex - 1);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleEdit = (homework: ExistingHomework) => {
    setEditingHomework(homework.id);
    setEditingType(homework.type);

    if (homework.type === "mcq") {
      setMcqQuestion(homework.question);
      setMcqImageUrl(homework.imageUrl || "");
      setOptions(homework.options || ["", ""]);
      setCorrectAnswerIndex(homework.correctAnswerIndex || null);
      // Scroll to the MCQ form
      window.scrollTo({
        top: document.getElementById("mcq-form")?.offsetTop,
        behavior: "smooth",
      });
    } else {
      setEssayQuestion(homework.question);
      setEssayImageUrl(homework.imageUrl || "");
      // Scroll to the essay form
      window.scrollTo({
        top: document.getElementById("essay-form")?.offsetTop,
        behavior: "smooth",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!year || !courseId || !lectureId) {
      setModalMessage("Missing course, lecture, or year information.");
      setShowModal(true);
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this homework question?"
    );
    if (!confirmDelete) return;

    const collectionPath = `years/${year}/courses/${courseId}/lectures/${lectureId}/homeworkQuestions`;
    const docRef = doc(db, collectionPath, id);

    try {
      await deleteDoc(docRef);
      setModalMessage("Homework question deleted successfully! 🗑️");
      setShowModal(true);
      fetchHomework();
    } catch (error) {
      console.error("Error deleting homework:", error);
      setModalMessage("Failed to delete homework question.");
      setShowModal(true);
    }
  };

  // --- Reset form fields ---
  const resetMcqForm = () => {
    setMcqQuestion("");
    setMcqImageUrl("");
    setOptions(["", ""]);
    setCorrectAnswerIndex(null);
  };

  const resetEssayForm = () => {
    setEssayQuestion("");
    setEssayImageUrl("");
  };

  const resetEditingState = () => {
    setEditingHomework(null);
    setEditingType(null);
  };

  // --- Submission handlers ---
  const handleSubmit = async (questionType: "mcq" | "essay") => {
    if (!year || !courseId || !lectureId) {
      setModalMessage("Missing course, lecture, or year information.");
      setShowModal(true);
      return;
    }

    try {
      const collectionPath = `years/${year}/courses/${courseId}/lectures/${lectureId}/homeworkQuestions`;

      if (questionType === "mcq") {
        if (
          !mcqQuestion.trim() ||
          options.some((opt) => !opt.trim()) ||
          correctAnswerIndex === null
        ) {
          setModalMessage(
            "Please complete all MCQ fields and select a correct answer."
          );
          setShowModal(true);
          return;
        }

        const data = {
          type: "mcq",
          question: mcqQuestion,
          options,
          correctAnswerIndex,
          imageUrl: mcqImageUrl.trim() || null,
          marks: 1,
        };

        if (editingHomework && editingType === "mcq") {
          await updateDoc(doc(db, collectionPath, editingHomework), data);
          setModalMessage("MCQ homework updated successfully! ✅");
        } else {
          await addDoc(collection(db, collectionPath), data);
          setModalMessage("MCQ homework saved successfully! ✅");
        }

        resetMcqForm();
      } else if (questionType === "essay") {
        if (!essayQuestion.trim()) {
          setModalMessage("Please enter an essay question.");
          setShowModal(true);
          return;
        }

        const data = {
          type: "essay",
          question: essayQuestion,
          imageUrl: essayImageUrl.trim() || null,
          marks: 1,
        };

        if (editingHomework && editingType === "essay") {
          await updateDoc(doc(db, collectionPath, editingHomework), data);
          setModalMessage("Essay homework updated successfully! ✅");
        } else {
          await addDoc(collection(db, collectionPath), data);
          setModalMessage("Essay homework saved successfully! ✅");
        }

        resetEssayForm();
      }

      resetEditingState();
      setShowModal(true);
      fetchHomework();
    } catch (error: unknown) {
      console.error(`Error adding/updating ${questionType}:`, error);
      setModalMessage(
        `Failed to save ${questionType}: ` + (error as Error).message
      );
      setShowModal(true);
    }
  };

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <p>Loading...</p>
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

  if (!year || !courseId || !lectureId) {
    return (
      <div className={styles.wrapper}>
        <p>Missing year, course, or lecture info in URL.</p>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <h1>Homework Builder</h1>
      <p>
        <strong>Year:</strong> {year.toUpperCase()} |{" "}
        <strong>Course ID:</strong> {courseId} | <strong>Lecture ID:</strong>{" "}
        {lectureId}
      </p>

      <hr />

      {/* MCQ Form */}
      <div className={styles.formSection} id="mcq-form">
        <h3>
          {editingHomework && editingType === "mcq"
            ? "Edit MCQ Homework"
            : "Add MCQ Homework"}
        </h3>
        <textarea
          placeholder="MCQ Question"
          value={mcqQuestion}
          onChange={(e) => setMcqQuestion(e.target.value)}
          style={{ marginBottom: "10px" }}
        />
        <input
          type="url"
          style={{ marginBottom: "10px" }}
          placeholder="Image URL (optional)"
          value={mcqImageUrl}
          onChange={(e) => setMcqImageUrl(e.target.value)}
        />

        {options.map((opt: string, idx: number) => (
          <div
            key={idx}
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              marginBottom: "5px",
            }}
          >
            <input
              type="text"
              placeholder={`Option ${idx + 1}`}
              value={opt}
              onChange={(e) => handleOptionChange(idx, e.target.value)}
            />
            <input
              type="radio"
              name="correct"
              checked={correctAnswerIndex === idx}
              onChange={() => setCorrectAnswerIndex(idx)}
            />
            <label>Correct</label>
            {options.length > 2 && (
              <button onClick={() => removeOption(idx)} type="button">
                🗑️
              </button>
            )}
          </div>
        ))}

        {options.length < 5 && (
          <button onClick={addOption}>➕ Add Option</button>
        )}

        <button
          style={{ marginLeft: "10px" }}
          onClick={() => handleSubmit("mcq")}
        >
          {editingHomework && editingType === "mcq"
            ? "✅ Update MCQ"
            : "✅ Save MCQ"}
        </button>

        {editingHomework && editingType === "mcq" && (
          <button
            style={{ marginLeft: "10px" }}
            onClick={() => {
              resetEditingState();
              resetMcqForm();
            }}
          >
            Cancel Edit
          </button>
        )}
      </div>

      <hr />

      {/* Essay Form */}
      <div className={styles.formSection} id="essay-form">
        <h3>
          {editingHomework && editingType === "essay"
            ? "Edit Essay Homework"
            : "Add Essay Homework"}
        </h3>
        <textarea
          placeholder="Essay Question"
          value={essayQuestion}
          onChange={(e) => setEssayQuestion(e.target.value)}
          style={{ marginBottom: "10px" }}
        />
        <input
          type="url"
          placeholder="Image URL (optional)"
          value={essayImageUrl}
          onChange={(e) => setEssayImageUrl(e.target.value)}
          style={{ marginBottom: "10px" }}
        />

        <button onClick={() => handleSubmit("essay")}>
          {editingHomework && editingType === "essay"
            ? "✅ Update Essay"
            : "✅ Save Essay"}
        </button>

        {editingHomework && editingType === "essay" && (
          <button
            style={{ marginLeft: "10px" }}
            onClick={() => {
              resetEditingState();
              resetEssayForm();
            }}
          >
            Cancel Edit
          </button>
        )}
      </div>

      <hr />

      {/* Existing Homework Questions */}
      <h2>Existing Homework Questions</h2>
      {existingHomework.length ? (
        <ul>
          {existingHomework.map((q, i) => (
            <li key={q.id} style={{ marginBottom: "20px" }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <strong>
                  {i + 1}. {q.question}
                </strong>
                <span
                  style={{
                    backgroundColor:
                      q.type === "mcq" ? "var(--dark)" : "#f3e5f5",
                    color: q.type === "mcq" ? "var(--white)" : "var(--dark)",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "0.8em",
                    fontWeight: "bold",
                  }}
                >
                  {q.type.toUpperCase()}
                </span>
                <span
                  style={{
                    backgroundColor: "#e3f2fd",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "0.8em",
                    fontWeight: "bold",
                  }}
                >
                  1 Mark
                </span>
              </div>

              {q.imageUrl && (
                <div className={styles.questionImage}>
                  <img
                    src={q.imageUrl}
                    alt={`Question ${i + 1}`}
                    style={{
                      maxWidth: "300px",
                      height: "auto",
                      margin: "10px 0",
                    }}
                  />
                </div>
              )}

              {q.type === "mcq" && q.options && q.options.length > 0 && (
                <ul className={styles.optionsList}>
                  {q.options.map((option, j) => (
                    <li
                      key={j}
                      className={`${styles.optionItem} ${
                        j === q.correctAnswerIndex ? styles.correctOption : ""
                      }`}
                    >
                      {option}
                      {j === q.correctAnswerIndex && (
                        <span className={styles.checkmark}>✅ </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button onClick={() => handleEdit(q)} type="button">
                  ✏️ Edit
                </button>
                <button onClick={() => handleDelete(q.id)} type="button">
                  🗑️ Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No homework questions yet.</p>
      )}

      {showModal && (
        <MessageModal
          message={modalMessage}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
