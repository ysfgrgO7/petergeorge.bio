"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  DocumentData,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Modal, { ModalVariant } from "@/app/components/Modal";
import styles from "../../../courses.module.css";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import Loading from "@/app/components/Loading";

interface HomeworkQuestion extends DocumentData {
  id: string;
  question: string;
  type: "mcq" | "essay";
  options?: string[];
  correctAnswerIndex?: number;
  imageUrl?: string;
}

interface SubmittedMCQAnswer {
  question: string;
  type: "mcq";
  selectedIndex: number;
  selectedText: string | null;
  correctAnswer: string;
  isCorrect: boolean;
}

interface SubmittedEssayAnswer {
  question: string;
  type: "essay";
  answerText: string;
}

type SubmittedAnswer = SubmittedMCQAnswer | SubmittedEssayAnswer;

export default function HomeworkClient() {
  const params = useSearchParams();
  const router = useRouter();
  const year = params.get("year");
  const courseId = params.get("courseId");
  const lectureId = params.get("lectureId");

  const [questions, setQuestions] = useState<HomeworkQuestion[]>([]);
  const [mcqAnswers, setMcqAnswers] = useState<number[]>([]);
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({});
  const [user, setUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalVariant, setModalVariant] = useState<ModalVariant>("error");
  const [loading, setLoading] = useState(true);
  const [homeworkSubmitted, setHomeworkSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  // Auto-save progress to Firestore
  const saveProgress = useCallback(async () => {
    if (!user || !year || !courseId || !lectureId || autoSaving) return;

    // Only save if there are actual answers
    const hasMcqAnswers = mcqAnswers.some((answer) => answer !== -1);
    const hasEssayAnswers = Object.values(essayAnswers).some(
      (answer) => answer.trim() !== "",
    );

    if (!hasMcqAnswers && !hasEssayAnswers) return;

    setAutoSaving(true);
    try {
      const draftRef = doc(
        db,
        "students",
        user.uid,
        "homeworkDrafts",
        `${year}_${courseId}_${lectureId}`,
      );

      await setDoc(draftRef, {
        year,
        courseId,
        lectureId,
        mcqAnswers,
        essayAnswers,
        lastSaved: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error saving progress:", error);
    } finally {
      setAutoSaving(false);
    }
  }, [user, year, courseId, lectureId, mcqAnswers, essayAnswers, autoSaving]);

  // Load saved progress from Firestore
  const loadSavedProgress = useCallback(
    async (mcqCount: number) => {
      if (!user || !year || !courseId || !lectureId) return;

      try {
        const draftRef = doc(
          db,
          "students",
          user.uid,
          "homeworkDrafts",
          `${year}_${courseId}_${lectureId}`,
        );
        const draftSnap = await getDoc(draftRef);

        if (draftSnap.exists()) {
          const data = draftSnap.data();

          // Restore MCQ answers if they exist and match expected length
          if (
            data.mcqAnswers &&
            Array.isArray(data.mcqAnswers) &&
            data.mcqAnswers.length === mcqCount
          ) {
            setMcqAnswers(data.mcqAnswers);
          }

          // Restore essay answers if they exist
          if (data.essayAnswers && typeof data.essayAnswers === "object") {
            setEssayAnswers(data.essayAnswers);
          }
        }
      } catch (error) {
        console.error("Error loading saved progress:", error);
      }
    },
    [user, year, courseId, lectureId],
  );

  // Auto-save when answers change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveProgress();
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [mcqAnswers, essayAnswers, saveProgress]);

  const handleSubmit = useCallback(async () => {
    if (homeworkSubmitted) return;
    setHomeworkSubmitted(true);

    if (!user || !year || !courseId || !lectureId) {
      setModalMessage("Missing user or homework details. Please log in.");
      setModalVariant("error");
      setShowModal(true);
      setHomeworkSubmitted(false);
      return;
    }

    let correctAnswersCount = 0;
    const submittedMCQAnswers: SubmittedMCQAnswer[] = [];
    const submittedEssayAnswers: SubmittedEssayAnswer[] = [];
    let totalMCQQuestions = 0;

    // Process answers
    let mcqIndex = 0;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      if (q.type === "mcq") {
        totalMCQQuestions++;
        const selectedIndex = Number.isFinite(Number(mcqAnswers[mcqIndex]))
          ? Number(mcqAnswers[mcqIndex])
          : -1;
        const correctIndex = Number(q.correctAnswerIndex ?? -1);
        const isCorrect = selectedIndex === correctIndex;

        if (isCorrect) {
          correctAnswersCount++;
        }

        submittedMCQAnswers.push({
          question: q.question,
          type: "mcq",
          selectedIndex,
          selectedText:
            selectedIndex !== -1 ? (q.options?.[selectedIndex] ?? null) : null,
          correctAnswer: q.options?.[correctIndex ?? -1] ?? "",
          isCorrect,
        });

        mcqIndex++;
      } else {
        submittedEssayAnswers.push({
          question: q.question,
          type: "essay",
          answerText: essayAnswers[q.id] ?? "",
        });
      }
    }

    try {
      // Save homework submission
      const submissionRef = doc(
        db,
        "students",
        user.uid,
        "homeworkProgress",
        `${year}_${courseId}_${lectureId}`,
      );

      await setDoc(submissionRef, {
        year,
        courseId,
        lectureId,
        score: correctAnswersCount,
        total: totalMCQQuestions,
        homeworkCompleted: true,
        answers: {
          mcq: submittedMCQAnswers,
          essay: submittedEssayAnswers,
        },
        submittedAt: serverTimestamp(),
      });

      // Delete the draft since homework is now submitted
      try {
        const draftRef = doc(
          db,
          "students",
          user.uid,
          "homeworkDrafts",
          `${year}_${courseId}_${lectureId}`,
        );
        await deleteDoc(draftRef);
      } catch (error) {
        console.error("Error deleting draft:", error);
        // Don't block submission if draft deletion fails
      }

      // Navigate to results
      router.push(
        `/courses/lectures/lecture/hw/results?year=${year}&courseId=${courseId}&lectureId=${lectureId}`,
      );
    } catch (error) {
      console.error("Error submitting homework:", error);
      setModalMessage("Failed to submit homework. Please try again.");
      setModalVariant("error");
      setShowModal(true);
      setHomeworkSubmitted(false);
    }
  }, [
    homeworkSubmitted,
    questions,
    mcqAnswers,
    essayAnswers,
    user,
    year,
    courseId,
    lectureId,
    router,
  ]);

  const handleConfirmSubmit = () => {
    // Check if all MCQ questions are answered
    const mcqQuestions = questions.filter((q) => q.type === "mcq");
    const answeredMCQs = mcqAnswers.filter((ans) => ans !== -1).length;

    // Check if all essay questions are answered
    const essayQuestions = questions.filter((q) => q.type === "essay");
    const answeredEssays = essayQuestions.filter(
      (q) => essayAnswers[q.id] && essayAnswers[q.id].trim() !== "",
    ).length;

    // Validation
    if (answeredMCQs < mcqQuestions.length) {
      setModalMessage(
        `Please answer all ${mcqQuestions.length} multiple choice questions. You have answered ${answeredMCQs} out of ${mcqQuestions.length}.`,
      );
      setModalVariant("warning");
      setShowModal(true);
      return;
    }

    if (answeredEssays < essayQuestions.length) {
      setModalMessage(
        `Please answer all ${essayQuestions.length} essay questions. You have answered ${answeredEssays} out of ${essayQuestions.length}.`,
      );
      setModalVariant("warning");
      setShowModal(true);
      return;
    }

    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    await handleSubmit();
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);

      if (!year || !courseId || !lectureId) {
        console.error(
          "Missing year, courseId, or lectureId in URL parameters.",
        );
        setModalMessage(
          "Missing homework details. Please navigate from the courses page.",
        );
        setModalVariant("warning");
        setShowModal(true);
        setLoading(false);
        return;
      }

      try {
        // Check if homework is already submitted
        const homeworkProgressRef = doc(
          db,
          "students",
          currentUser.uid,
          "homeworkProgress",
          `${year}_${courseId}_${lectureId}`,
        );
        const homeworkProgressSnap = await getDoc(homeworkProgressRef);

        if (
          homeworkProgressSnap.exists() &&
          homeworkProgressSnap.data().homeworkCompleted
        ) {
          setModalMessage("You have already submitted this homework.");
          setModalVariant("info");
          setShowModal(true);
          setLoading(false);
          return;
        }

        // Fetch homework questions
        const homeworkRef = collection(
          db,
          `years/${year}/courses/${courseId}/lectures/${lectureId}/homeworkQuestions`,
        );
        const homeworkSnapshot = await getDocs(homeworkRef);

        // Map questions without shuffling - keep original order
        const homeworkQuestions = homeworkSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as HomeworkQuestion[];

        setQuestions(homeworkQuestions);

        // Count MCQ questions to initialize answers array
        const mcqCount = homeworkQuestions.filter(
          (q) => q.type === "mcq",
        ).length;
        setMcqAnswers(new Array(mcqCount).fill(-1));
        setEssayAnswers({});

        // Load saved progress after initializing
        await loadSavedProgress(mcqCount);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching homework data:", error);
        setModalMessage("Failed to load homework. Please try again later.");
        setModalVariant("error");
        setShowModal(true);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [year, courseId, lectureId, router, loadSavedProgress]);

  const handleMcqChange = (qIndex: number, optionIndex: number) => {
    const updatedAnswers = [...mcqAnswers];
    updatedAnswers[qIndex] = optionIndex;
    setMcqAnswers(updatedAnswers);
  };

  const handleEssayChange = (questionId: string, answerText: string) => {
    setEssayAnswers((prevState) => ({
      ...prevState,
      [questionId]: answerText,
    }));
  };

  // Calculate progress for display
  const mcqQuestions = questions.filter((q) => q.type === "mcq");
  const essayQuestions = questions.filter((q) => q.type === "essay");
  const answeredMCQs = mcqAnswers.filter((ans) => ans !== -1).length;
  const answeredEssays = essayQuestions.filter(
    (q) => essayAnswers[q.id] && essayAnswers[q.id].trim() !== "",
  ).length;

  const totalQuestions = questions.length;
  const solvedQuestions = answeredMCQs + answeredEssays;
  const unsolvedQuestions = totalQuestions - solvedQuestions;

  // Check if all questions are answered
  const allQuestionsAnswered =
    answeredMCQs === mcqQuestions.length &&
    answeredEssays === essayQuestions.length;

  if (loading) {
    return <Loading text="Loading homework..." />;
  }

  if (questions.length === 0) {
    return (
      <div className={styles.wrapper}>
        <h1>Lecture Homework</h1>
        <hr />
        <p>No homework questions found for this lecture.</p>
      </div>
    );
  }

  return (
    <div
      className="wrapper"
      style={{
        width: isMobile ? "100%" : "calc(100% - 200px)",
        position: isMobile ? "unset" : "relative",
      }}
    >
      <h1>Lecture Homework</h1>
      <hr />

      {/* Render MCQ Questions */}
      {questions
        .filter((q) => q.type === "mcq")
        .map((q, i) => (
          <div key={q.id} className={styles.question}>
            <p>
              <strong>
                Q{i + 1}: {q.question}
              </strong>
            </p>
            {q.imageUrl && (
              <div className={styles.quizImageContainer}>
                <img
                  src={q.imageUrl}
                  alt={`Question ${i + 1}`}
                  className={styles.quizImage}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.src =
                      "https://placehold.co/400x200/cccccc/000000?text=Image+Not+Found";
                  }}
                />
              </div>
            )}
            {q.options!.map((opt: string, j: number) => (
              <label
                key={j}
                className={`${styles.choices} ${
                  mcqAnswers[i] === j ? styles.selectedChoice : ""
                }`}
              >
                <input
                  type="radio"
                  name={`q-${i}`}
                  checked={mcqAnswers[i] === j}
                  style={{
                    marginRight: "0.2rem",
                    visibility: "hidden",
                  }}
                  onChange={() => handleMcqChange(i, j)}
                />
                {opt}
              </label>
            ))}
            <hr />
          </div>
        ))}

      {/* Render Essay Questions */}
      {questions.filter((q) => q.type === "essay").length > 0 && (
        <div className={styles.essayQuestionsSection}>
          <h2>Essay Questions</h2>
          <p>Please provide detailed answers in the boxes below.</p>
          <hr />
          {questions
            .filter((q) => q.type === "essay")
            .map((q, i) => (
              <div key={q.id} className={styles.question}>
                <p>
                  <strong>
                    Q{mcqQuestions.length + i + 1}: {q.question}
                  </strong>
                </p>
                {q.imageUrl && (
                  <div className={styles.quizImageContainer}>
                    <img
                      src={q.imageUrl}
                      alt={`Question ${mcqQuestions.length + i + 1}`}
                      className={styles.quizImage}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.src =
                          "https://placehold.co/400x200/cccccc/000000?text=Image+Not+Found";
                      }}
                    />
                  </div>
                )}
                <div className={styles.essayAnswerContainer}>
                  <label htmlFor={`essay-${q.id}`}>Your Answer:</label>
                  <textarea
                    id={`essay-${q.id}`}
                    className={styles.essayTextarea}
                    value={essayAnswers[q.id] || ""}
                    onChange={(e) => handleEssayChange(q.id, e.target.value)}
                    rows={8}
                  ></textarea>
                </div>
                <hr />
              </div>
            ))}
        </div>
      )}

      {questions.length > 0 && (
        <div className={styles.quizSummaryFloating}>
          <div>
            <h2>Homework Summary</h2>
            <p>
              Total Questions: <strong>{totalQuestions}</strong>
            </p>
            <p>
              MCQ Questions:{" "}
              <strong>
                {answeredMCQs}/{mcqQuestions.length}
              </strong>
            </p>
            <p>
              Essay Questions:{" "}
              <strong>
                {answeredEssays}/{essayQuestions.length}
              </strong>
            </p>
            <p>
              Unanswered: <strong>{unsolvedQuestions}</strong>
            </p>
            {autoSaving && (
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "var(--blue)",
                  fontStyle: "italic",
                }}
              >
                Saving progress...
              </p>
            )}
            <hr />
          </div>
          <button
            onClick={handleConfirmSubmit}
            disabled={homeworkSubmitted || !allQuestionsAnswered}
            style={{
              textAlign: "center",
              opacity: allQuestionsAnswered ? 1 : 0.5,
              cursor: allQuestionsAnswered ? "pointer" : "not-allowed",
              backgroundColor: allQuestionsAnswered ? undefined : "#cccccc",
            }}
          >
            {homeworkSubmitted ? "Submitting..." : "Submit Homework"}
          </button>
          {!allQuestionsAnswered && (
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--red)",
                textAlign: "center",
                marginTop: "8px",
                fontStyle: "italic",
              }}
            >
              Please answer all questions to submit
            </p>
          )}
        </div>
      )}
      <hr className={styles.summaryHr} />

      {showModal && (
        <Modal
          isOpen={showModal}
          type="toast"
          variant={modalVariant}
          message={modalMessage}
          onClose={() => setShowModal(false)}
        />
      )}
      {showConfirm && (
        <Modal
          isOpen={showConfirm}
          type="popup"
          variant="warning"
          title="Finish Homework?"
          message="Are you sure you want to submit your homework? You cannot change your answers after submitting."
          confirmText="Yes, Submit"
          cancelText="No, Keep Solving"
          onConfirm={confirmSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
