"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import styles from "../admin.module.css";
import MessageModal from "@/app/MessageModal";
import { onAuthStateChanged } from "firebase/auth";
import { IoCloseCircleSharp, IoAdd } from "react-icons/io5";

// Interfaces
interface ExistingQuiz extends DocumentData {
  id: string;
  question: string;
  options?: string[];
  correctAnswerIndex?: number;
  imageUrl?: string;
  marks?: number;
  type?: string;
}

interface QuizData {
  type: "mcq" | "essay";
  question: string;
  options?: string[];
  correctAnswerIndex?: number;
  imageUrl?: string | null;
  marks: 1 | 2;
}

// Question Card Component
const QuestionCard = ({
  question,
  index,
  onEdit,
  onDelete,
  type = "mcq",
}: {
  question: ExistingQuiz;
  index: number;
  onEdit: (question: ExistingQuiz) => void;
  onDelete: (id: string) => void;
  type?: string;
}) => {
  return (
    <div className={styles.questionCard}>
      <div className={styles.questionHeader}>
        <div className={styles.questionNumber}>Question {index + 1}</div>
        <div className={styles.questionActions}>
          <button
            className={styles.editBtn}
            onClick={() => onEdit(question)}
            title="Edit question"
          >
            ✏️
          </button>
          <button
            className={styles.deleteBtn}
            onClick={() => onDelete(question.id)}
            title="Delete question"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className={styles.questionContent}>
        <div className={styles.questionText}>{question.question}</div>

        {question.imageUrl && (
          <div style={{ margin: "16px 0" }}>
            <img
              src={question.imageUrl}
              alt={`Question ${index + 1}`}
              width={400}
              height={300}
              style={{ maxWidth: "100%", height: "auto", borderRadius: "8px" }}
            />
          </div>
        )}

        {type === "mcq" && question.options && question.options.length > 0 && (
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
    </div>
  );
};

// Add Question Card Component
const AddQuestionCard = ({
  type,
  onSubmit,
  isEditing = false,
  editData = null,
  onCancel,
}: {
  type: "mcq" | "essay";
  onSubmit: (data: QuizData) => void;
  isEditing?: boolean;
  editData?: ExistingQuiz | null;
  onCancel?: () => void;
}) => {
  const [question, setQuestion] = useState(editData?.question || "");
  const [imageUrl, setImageUrl] = useState(editData?.imageUrl || "");
  const [marks, setMarks] = useState<1 | 2>(
    editData?.marks === 1 || editData?.marks === 2 ? editData.marks : 1
  );
  const [options, setOptions] = useState(editData?.options || ["", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(
    editData?.correctAnswerIndex ?? null
  );

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
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

    // Reset form
    setQuestion("");
    setImageUrl("");
    setMarks(1);
    setOptions(["", ""]);
    setCorrectAnswerIndex(null);
  };

  return (
    <div className={styles.questionCard}>
      <h3>
        {isEditing
          ? `Edit ${type.toUpperCase()}`
          : `Add New ${type.toUpperCase()}`}
      </h3>

      <div style={{ marginBottom: "20px" }}>
        <label>Question</label>
        <textarea
          placeholder="Enter your question here..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          style={{ flex: 1 }}
        />
      </div>

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
        <select
          value={marks}
          onChange={(e) => setMarks(Number(e.target.value) as 1 | 2)}
        >
          <option value={1}>1 Point</option>
          <option value={2}>2 Points</option>
        </select>
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

          {options.length < 4 && (
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
        <button onClick={handleSubmit}>
          {isEditing ? "Update Question" : "Save Question"}
        </button>
        {isEditing && onCancel && <button onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
};

export default function QuizBuilder() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const year = searchParams.get("year");
  const courseId = searchParams.get("courseId");
  const lectureId = searchParams.get("lectureId");

  // State
  const [existingQuizzes, setExistingQuizzes] = useState<ExistingQuiz[]>([]);
  const [existingEssays, setExistingEssays] = useState<ExistingQuiz[]>([]);
  const [editingMcq, setEditingMcq] = useState<ExistingQuiz | null>(null);
  const [editingEssay, setEditingEssay] = useState<ExistingQuiz | null>(null);
  const [showAddMcq, setShowAddMcq] = useState(false);
  const [showAddEssay, setShowAddEssay] = useState(false);

  // Duration state
  const [quizDurationInput, setQuizDurationInput] = useState<number | "">("");
  const [currentQuizDuration, setCurrentQuizDuration] = useState<number | null>(
    null
  );
  const [isDurationLoading, setIsDurationLoading] = useState(true);

  // UI state
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [activeTab, setActiveTab] = useState<
    "variant1" | "variant2" | "variant3"
  >("variant1");
  const [isCopying, setIsCopying] = useState(false);

  // Duration logic
  const fetchQuizDuration = useCallback(async () => {
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
  }, [year, courseId, lectureId]);

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

  // Fetch quizzes
  const fetchQuizzes = useCallback(
    async (tab: "variant1" | "variant2" | "variant3") => {
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
    },
    [year, courseId, lectureId]
  );

  const copyToAllVariants = async () => {
    if (!year || !courseId || !lectureId) {
      setModalMessage("Missing course, lecture, or year information.");
      setShowModal(true);
      return;
    }

    if (existingQuizzes.length === 0) {
      setModalMessage(
        `No MCQ questions found in ${activeTab.replace(
          "variant",
          "Variant "
        )} to copy.`
      );
      setShowModal(true);
      return;
    }

    const confirmCopy = window.confirm(
      `Are you sure you want to copy all ${
        existingQuizzes.length
      } MCQ questions from ${activeTab.replace(
        "variant",
        "Variant "
      )} to all other variants? This will replace existing questions in the other variants.`
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

        existingQuizzes.forEach((quiz) => {
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
        `Successfully copied ${
          existingQuizzes.length
        } MCQ questions from ${activeTab.replace(
          "variant",
          "Variant "
        )} to all other variants! 🎉`
      );
      setShowModal(true);
    } catch (error: unknown) {
      console.error("Error copying to all variants:", error);
      setModalMessage(
        "Failed to copy questions to all variants: " + (error as Error).message
      );
      setShowModal(true);
    } finally {
      setIsCopying(false);
    }
  };

  // Handlers
  const handleEditMcq = (quiz: ExistingQuiz) => {
    setEditingMcq(quiz);
    setShowAddMcq(false);
  };

  const handleEditEssay = (essay: ExistingQuiz) => {
    setEditingEssay(essay);
    setShowAddEssay(false);
  };

  const handleDelete = async (quizType: "mcq" | "essay", id: string) => {
    if (!year || !courseId || !lectureId) {
      setModalMessage("Missing course, lecture, or year information.");
      setShowModal(true);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete this ${quizType}?`)) {
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

  const handleSubmit = async (quizType: "mcq" | "essay", data: QuizData) => {
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
      const collectionPath =
        quizType === "mcq"
          ? `years/${year}/courses/${courseId}/lectures/${lectureId}/${activeTab}Quizzes`
          : `years/${year}/courses/${courseId}/lectures/${lectureId}/essayQuestions`;

      const isEditing = quizType === "mcq" ? editingMcq : editingEssay;

      if (isEditing) {
        await updateDoc(doc(db, collectionPath, isEditing.id), { ...data });
        setModalMessage(`${quizType.toUpperCase()} updated successfully! ✅`);
        if (quizType === "mcq") {
          setEditingMcq(null);
        } else {
          setEditingEssay(null);
        }
      } else {
        await addDoc(collection(db, collectionPath), data);
        setModalMessage(`${quizType.toUpperCase()} saved successfully! ✅`);
        if (quizType === "mcq") {
          setShowAddMcq(false);
        } else {
          setShowAddEssay(false);
        }
      }

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

  // Effects
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.email) {
          const adminDocRef = doc(db, "admins", user.email);
          const adminDocSnap = await getDoc(adminDocRef);

          if (adminDocSnap.exists()) {
            // Admin check passed, user can access
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
  }, [year, courseId, lectureId, activeTab, fetchQuizDuration, fetchQuizzes]);

  useEffect(() => {
    setEditingMcq(null);
    setEditingEssay(null);
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
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <h1>Quiz Builder</h1>
      <p style={{ marginBottom: "20px", fontSize: "14px" }}>
        <strong>Year:</strong> {year.toUpperCase()} |{" "}
        <strong>Course ID:</strong> {courseId} | <strong>Lecture ID:</strong>{" "}
        {lectureId}
      </p>

      {/* Duration Section */}
      <div className={styles.durationCard}>
        <h2 style={{ fontWeight: "400" }}>Quiz Duration</h2>
        {isDurationLoading ? (
          <p>Loading...</p>
        ) : currentQuizDuration === null ? (
          <div className={styles.durationControls}>
            <input
              type="number"
              placeholder="Set Quiz Duration (minutes)"
              value={quizDurationInput}
              onChange={(e) =>
                setQuizDurationInput(
                  e.target.value === "" ? "" : Number(e.target.value)
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
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              min="1"
            />
            <button onClick={saveQuizDuration}>Update Duration</button>
          </div>
        )}
      </div>

      {/* Tabs */}
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

      {/* Main Content */}
      <div>
        <div className={styles.sectionHeader}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "400" }}>
            {activeTab.replace("variant", "Variant ")} Questions
          </h2>
          {existingQuizzes.length > 0 && (
            <button
              onClick={copyToAllVariants}
              disabled={isCopying}
              className={styles.copyAllBtn}
            >
              {isCopying ? "🔄 Copying..." : "📋 Copy to All Variants"}
            </button>
          )}
        </div>

        {/* Add Question Buttons */}
        <div className={styles.addQuestionButtons}>
          <button
            onClick={() => {
              setShowAddMcq(!showAddMcq);
              setShowAddEssay(false);
              setEditingMcq(null);
              setEditingEssay(null);
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
              setEditingMcq(null);
              setEditingEssay(null);
            }}
            className={`${styles.addBtn} ${showAddEssay ? styles.active : ""}`}
          >
            <IoAdd style={{ fontSize: "1rem" }} />
            Add Essay Question
          </button>
        </div>

        {/* Add/Edit Cards */}
        {(showAddMcq || editingMcq) && (
          <AddQuestionCard
            type="mcq"
            onSubmit={(data) => handleSubmit("mcq", data)}
            isEditing={!!editingMcq}
            editData={editingMcq}
            onCancel={() => {
              setEditingMcq(null);
              setShowAddMcq(false);
            }}
          />
        )}

        {(showAddEssay || editingEssay) && (
          <AddQuestionCard
            type="essay"
            onSubmit={(data) => handleSubmit("essay", data)}
            isEditing={!!editingEssay}
            editData={editingEssay}
            onCancel={() => {
              setEditingEssay(null);
              setShowAddEssay(false);
            }}
          />
        )}

        {/* Existing Questions */}
        <div>
          {/* MCQ Questions */}
          {existingQuizzes.length > 0 && (
            <>
              <h2>Multiple Choice Questions ({existingQuizzes.length})</h2>
              <div className={styles.questionsList}>
                {existingQuizzes.map((quiz, index) => (
                  <QuestionCard
                    key={quiz.id}
                    question={quiz}
                    index={index}
                    onEdit={handleEditMcq}
                    onDelete={(id) => handleDelete("mcq", id)}
                    type="mcq"
                  />
                ))}
              </div>
            </>
          )}

          {/* Essay Questions */}
          {existingEssays.length > 0 && (
            <div style={{ marginBottom: "32px" }}>
              <h3>
                Essay Questions ({existingEssays.length}) - Shared across all
                variants
              </h3>
              <div className={styles.questionsList}>
                {existingEssays.map((essay, index) => (
                  <QuestionCard
                    key={essay.id}
                    question={essay}
                    index={index}
                    onEdit={handleEditEssay}
                    onDelete={(id) => handleDelete("essay", id)}
                    type="essay"
                  />
                ))}
              </div>
            </div>
          )}

          {existingQuizzes.length === 0 && existingEssays.length === 0 && (
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
        <MessageModal
          message={modalMessage}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
