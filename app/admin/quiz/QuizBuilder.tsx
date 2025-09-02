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
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import styles from "../admin.module.css";
import MessageModal from "@/app/MessageModal";
import { onAuthStateChanged } from "firebase/auth";

// Interfaces
interface ExistingQuiz extends DocumentData {
  id: string;
  question: string;
  options?: string[];
  correctAnswerIndex?: number;
  imageUrl?: string;
  marks?: number; // 👈 Added marks property
}

export default function QuizBuilder() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const year = searchParams.get("year");
  const courseId = searchParams.get("courseId");
  const lectureId = searchParams.get("lectureId");

  // --- Quiz content state ---
  const [mcqQuestion, setMcqQuestion] = useState("");
  const [mcqImageUrl, setMcqImageUrl] = useState("");
  const [mcqMarks, setMcqMarks] = useState<1 | 2>(1); // 👈 New state for MCQ marks
  const [options, setOptions] = useState(["", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(
    null
  );
  const [existingQuizzes, setExistingQuizzes] = useState<ExistingQuiz[]>([]);
  const [essayQuestion, setEssayQuestion] = useState("");
  const [essayImageUrl, setEssayImageUrl] = useState("");
  const [essayMarks, setEssayMarks] = useState<1 | 2>(1); // 👈 New state for essay marks
  const [existingEssays, setExistingEssays] = useState<ExistingQuiz[]>([]);
  const [editingMcq, setEditingMcq] = useState<string | null>(null);
  const [editingEssay, setEditingEssay] = useState<string | null>(null);

  // --- Duration state ---
  const [quizDurationInput, setQuizDurationInput] = useState<number | "">("");
  const [currentQuizDuration, setCurrentQuizDuration] = useState<number | null>(
    null
  );
  const [isDurationLoading, setIsDurationLoading] = useState(true);

  // --- UI state ---
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [activeTab, setActiveTab] = useState<
    "variant1" | "variant2" | "variant3"
  >("variant1");

  // --- Duration logic ---
  const fetchQuizDuration = async () => {
    if (!year || !courseId || !lectureId) {
      setIsDurationLoading(false);
      return;
    }
    setIsDurationLoading(true);
    try {
      const settingsDocRef = doc(
        db,
        `years/${year}/courses/${courseId}/lectures/${lectureId}/quizSettings/duration`
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
      setShowModal(true);
      setCurrentQuizDuration(null);
    } finally {
      setIsDurationLoading(false);
    }
  };

  const saveQuizDuration = async () => {
    const durationValue = Number(quizDurationInput);
    if (
      quizDurationInput === "" ||
      isNaN(durationValue) ||
      durationValue <= 0
    ) {
      setModalMessage(
        "Please enter a valid positive number for quiz duration."
      );
      setShowModal(true);
      return;
    }
    if (!year || !courseId || !lectureId) {
      setModalMessage(
        "Missing course, lecture, or year information to save duration."
      );
      setShowModal(true);
      return;
    }
    try {
      const settingsDocRef = doc(
        db,
        `years/${year}/courses/${courseId}/lectures/${lectureId}/quizSettings/duration`
      );
      await setDoc(settingsDocRef, { duration: durationValue });
      setCurrentQuizDuration(durationValue);
      setQuizDurationInput("");
      setModalMessage("Quiz duration saved successfully! 🎉");
      setShowModal(true);
    } catch (error: unknown) {
      console.error("Error saving quiz duration:", error);
      setModalMessage(
        "Failed to save quiz duration: " + (error as Error).message
      );
      setShowModal(true);
    }
  };

  // --- Fetch quizzes ---
  const fetchQuizzes = async (tab: "variant1" | "variant2" | "variant3") => {
    if (!year || !courseId || !lectureId) return;
    let mcqCollectionPath: string;

    switch (tab) {
      case "variant1":
        mcqCollectionPath = `years/${year}/courses/${courseId}/lectures/${lectureId}/variant1Quizzes`;
        break;
      case "variant2":
        mcqCollectionPath = `years/${year}/courses/${courseId}/lectures/${lectureId}/variant2Quizzes`;
        break;
      case "variant3":
        mcqCollectionPath = `years/${year}/courses/${courseId}/lectures/${lectureId}/variant3Quizzes`;
        break;
      default:
        return;
    }

    const essayCollectionPath = `years/${year}/courses/${courseId}/lectures/${lectureId}/essayQuestions`;

    try {
      const mcqQuestionsRef = collection(db, mcqCollectionPath);
      const mcqSnapshot = await getDocs(mcqQuestionsRef);
      const quizzes = mcqSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ExistingQuiz[];
      setExistingQuizzes(quizzes);

      const essayRef = collection(db, essayCollectionPath);
      const essaySnap = await getDocs(essayRef);
      const essays = essaySnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ExistingQuiz[];
      setExistingEssays(essays);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      setModalMessage("Failed to fetch existing quizzes.");
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
    fetchQuizzes(activeTab);
  }, [year, courseId, lectureId, activeTab]);

  useEffect(() => {
    setMcqQuestion("");
    setMcqImageUrl("");
    setMcqMarks(1); // 👈 Reset marks to default
    setOptions(["", ""]);
    setCorrectAnswerIndex(null);
    setEssayQuestion("");
    setEssayImageUrl("");
    setEssayMarks(1); // 👈 Reset marks to default
    setEditingMcq(null);
    setEditingEssay(null);
  }, [activeTab]);

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

  // 👈 Updated handleEdit function for MCQs
  const handleEditMcq = (quiz: ExistingQuiz) => {
    setEditingMcq(quiz.id);
    setMcqQuestion(quiz.question);
    setMcqImageUrl(quiz.imageUrl || "");
    setMcqMarks((quiz.marks as 1 | 2) || 1); // 👈 Set marks or default to 1
    setOptions(quiz.options || ["", ""]);
    setCorrectAnswerIndex(quiz.correctAnswerIndex || null);
    // Scroll to the form
    window.scrollTo({
      top: document.getElementById("mcq-form")?.offsetTop,
      behavior: "smooth",
    });
  };

  // 👈 Updated handleEdit function for essays
  const handleEditEssay = (essay: ExistingQuiz) => {
    setEditingEssay(essay.id);
    setEssayQuestion(essay.question);
    setEssayImageUrl(essay.imageUrl || "");
    setEssayMarks((essay.marks as 1 | 2) || 1); // 👈 Set marks or default to 1
    // Scroll to the form
    window.scrollTo({
      top: document.getElementById("essay-form")?.offsetTop,
      behavior: "smooth",
    });
  };

  const handleDelete = async (quizType: "mcq" | "essay", id: string) => {
    if (!year || !courseId || !lectureId) {
      setModalMessage("Missing course, lecture, or year information.");
      setShowModal(true);
      return;
    }
    const collectionPath =
      quizType === "mcq"
        ? `years/${year}/courses/${courseId}/lectures/${lectureId}/${activeTab}Quizzes`
        : `years/${year}/courses/${courseId}/lectures/${lectureId}/essayQuestions`;
    const docRef = doc(db, collectionPath, id);
    try {
      await deleteDoc(docRef);
      setModalMessage(`${quizType.toUpperCase()} deleted successfully! 🗑️`);
      setShowModal(true);
      fetchQuizzes(activeTab);
    } catch (error) {
      console.error(`Error deleting ${quizType}:`, error);
      setModalMessage(`Failed to delete ${quizType}.`);
      setShowModal(true);
    }
  };

  // --- Submission handlers ---
  const handleSubmit = async (quizType: "mcq" | "essay") => {
    if (currentQuizDuration === null) {
      setModalMessage("Please set the overall quiz duration first.");
      setShowModal(true);
      return;
    }

    if (!year || !courseId || !lectureId) {
      setModalMessage("Missing course, lecture, or year information.");
      setShowModal(true);
      return;
    }

    try {
      if (quizType === "mcq") {
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

        const collectionPath = `years/${year}/courses/${courseId}/lectures/${lectureId}/${activeTab}Quizzes`;
        const data = {
          type: "mcq",
          question: mcqQuestion,
          options,
          correctAnswerIndex,
          imageUrl: mcqImageUrl.trim() || null,
          marks: mcqMarks, // 👈 Include marks in data
        };

        if (editingMcq) {
          await updateDoc(doc(db, collectionPath, editingMcq), data);
          setModalMessage("MCQ updated successfully! ✅");
        } else {
          await addDoc(collection(db, collectionPath), data);
          setModalMessage("MCQ saved successfully! ✅");
        }
      } else if (quizType === "essay") {
        if (!essayQuestion.trim()) {
          setModalMessage("Please enter an essay question.");
          setShowModal(true);
          return;
        }

        const collectionPath = `years/${year}/courses/${courseId}/lectures/${lectureId}/essayQuestions`;
        const data = {
          type: "essay",
          question: essayQuestion,
          imageUrl: essayImageUrl.trim() || null,
          marks: essayMarks, // 👈 Include marks in data
        };

        if (editingEssay) {
          await updateDoc(doc(db, collectionPath, editingEssay), data);
          setModalMessage("Essay updated successfully! ✅");
        } else {
          await addDoc(collection(db, collectionPath), data);
          setModalMessage("Essay saved successfully! ✅");
        }
      }

      // Reset form fields
      setMcqQuestion("");
      setMcqImageUrl("");
      setMcqMarks(1); // 👈 Reset marks to default
      setOptions(["", ""]);
      setCorrectAnswerIndex(null);
      setEssayQuestion("");
      setEssayImageUrl("");
      setEssayMarks(1); // 👈 Reset marks to default
      setEditingMcq(null);
      setEditingEssay(null);

      setShowModal(true);
      fetchQuizzes(activeTab);
    } catch (error: unknown) {
      console.error(`Error adding/updating ${quizType}:`, error);
      setModalMessage(
        `Failed to save ${quizType}: ` + (error as Error).message
      );
      setShowModal(true);
    }
  };

  if (!year || !courseId || !lectureId) {
    return (
      <div className={styles.wrapper}>
        <p>Missing year, course, or lecture info in URL.</p>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <h1>Quiz Builder</h1>
      <p>
        <strong>Year:</strong> {year.toUpperCase()} |{" "}
        <strong>Course ID:</strong> {courseId} | <strong>Lecture ID:</strong>{" "}
        {lectureId}
      </p>

      {/* Tabs for different quiz variants */}
      <div className={styles.tabs} style={{ display: "flex", gap: "10px" }}>
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

      <hr />

      {/* Duration Section */}
      <div className={styles.quizDurationSection}>
        <h2>Quiz Duration</h2>
        {isDurationLoading ? (
          <p>Loading...</p>
        ) : currentQuizDuration === null ? (
          <>
            <input
              type="number"
              style={{ marginBottom: "10px" }}
              placeholder="Set Quiz Duration (minutes)"
              value={quizDurationInput}
              onChange={(e) =>
                setQuizDurationInput(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              min="1"
            />
            <button onClick={saveQuizDuration}>Set Duration</button>
          </>
        ) : (
          <>
            <p>
              Current Duration: <strong>{currentQuizDuration} minutes</strong>
            </p>
            <input
              type="number"
              style={{ marginBottom: "10px" }}
              placeholder="New Duration (minutes)"
              value={quizDurationInput}
              onChange={(e) =>
                setQuizDurationInput(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              min="1"
            />
            <button onClick={saveQuizDuration}>Update Duration</button>
          </>
        )}
      </div>

      <hr />

      {/* MCQ Form */}
      <div className={styles.variantSection}>
        <h2>Add Questions to {activeTab.replace("variant", "Variant ")}</h2>
        <div className={styles.formSection} id="mcq-form">
          <h3>{editingMcq ? "Edit MCQ" : "Add MCQ"}</h3>
          <textarea
            placeholder="Question"
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

          {/* 👈 Marks selector for MCQ */}
          <div style={{ marginBottom: "10px" }}>
            <label style={{ fontWeight: "bold", marginRight: "10px" }}>
              Marks:
            </label>
            <select
              value={mcqMarks}
              onChange={(e) => setMcqMarks(Number(e.target.value) as 1 | 2)}
              style={{
                padding: "5px 10px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                fontSize: "14px",
              }}
            >
              <option value={1}>1 Mark</option>
              <option value={2}>2 Marks</option>
            </select>
          </div>

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
            {editingMcq ? "✅ Update MCQ" : "✅ Save MCQ"}
          </button>
          {editingMcq && (
            <button
              style={{ marginLeft: "10px" }}
              onClick={() => {
                setEditingMcq(null);
                setMcqQuestion("");
                setMcqImageUrl("");
                setMcqMarks(1); // 👈 Reset marks to default
                setOptions(["", ""]);
                setCorrectAnswerIndex(null);
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
            {editingEssay
              ? "Edit Essay Question"
              : "Add Essay Question (Shared)"}
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

          {/* 👈 Marks selector for Essay */}
          <div style={{ marginBottom: "10px" }}>
            <label style={{ fontWeight: "bold", marginRight: "10px" }}>
              Marks:
            </label>
            <select
              value={essayMarks}
              onChange={(e) => setEssayMarks(Number(e.target.value) as 1 | 2)}
              style={{
                padding: "5px 10px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                fontSize: "14px",
              }}
            >
              <option value={1}>1 Mark</option>
              <option value={2}>2 Marks</option>
            </select>
          </div>

          <button onClick={() => handleSubmit("essay")}>
            {editingEssay ? "✅ Update Essay" : "✅ Save Essay"}
          </button>
          {editingEssay && (
            <button
              style={{ marginLeft: "10px" }}
              onClick={() => {
                setEditingEssay(null);
                setEssayQuestion("");
                setEssayImageUrl("");
                setEssayMarks(1); // 👈 Reset marks to default
              }}
            >
              Cancel Edit
            </button>
          )}
        </div>

        <hr />

        {/* Existing MCQs */}
        <h2>Existing MCQs in {activeTab.replace("variant", "Variant ")}</h2>
        {existingQuizzes.length ? (
          <ul>
            {existingQuizzes.map((q, i) => (
              <li key={q.id}>
                {i + 1}. {q.question}
                {/* 👈 Display marks */}
                <span
                  style={{
                    backgroundColor: "var(--dark)",
                    color: "var(--white)",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "0.8em",
                    marginLeft: "10px",
                    fontWeight: "bold",
                  }}
                >
                  {q.marks || 1} {q.marks === 1 ? "Mark" : "Marks"}
                </span>
                {q.imageUrl && (
                  <div className={styles.questionImage}>
                    <img
                      src={q.imageUrl}
                      alt={`Question ${i + 1}`}
                      style={{ maxWidth: "300px", height: "auto" }}
                    />
                  </div>
                )}
                {q.options && q.options.length > 0 && (
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
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => handleEditMcq(q)} type="button">
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete("mcq", q.id)}
                    type="button"
                  >
                    🗑️ Delete
                  </button>
                </div>
                <br />
              </li>
            ))}
          </ul>
        ) : (
          <p>No MCQs yet.</p>
        )}

        {/* Existing Essays */}
        <h2>Existing Essays (Shared)</h2>
        {existingEssays.length ? (
          <ul>
            {existingEssays.map((q, i) => (
              <li key={q.id}>
                {i + 1}. {q.question}
                {/* 👈 Display marks */}
                <span
                  style={{
                    backgroundColor: "#f3e5f5",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "0.8em",
                    marginLeft: "10px",
                    fontWeight: "bold",
                  }}
                >
                  {q.marks || 1} {q.marks === 1 ? "Mark" : "Marks"}
                </span>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => handleEditEssay(q)} type="button">
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete("essay", q.id)}
                    type="button"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No essays yet.</p>
        )}
      </div>

      {showModal && (
        <MessageModal
          message={modalMessage}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
