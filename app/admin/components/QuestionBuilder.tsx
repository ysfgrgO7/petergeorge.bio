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
import { IoAdd } from "react-icons/io5";
import Loading from "@/app/components/Loading";
import QuestionCard from "./QuestionCard";
import AddQuestionCard from "./AddQuestionCard";

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
