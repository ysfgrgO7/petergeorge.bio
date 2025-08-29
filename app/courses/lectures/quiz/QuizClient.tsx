"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  DocumentData,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  markQuizComplete,
  unlockLecture,
  incrementQuizAttempt,
  getQuizAttemptInfo,
} from "@/lib/studentProgress";
import { getUnusedQuizVariant, getRandomQuizVariant } from "@/lib/quizUtils";
import ConfirmModal from "./confirmModal";
import styles from "../../courses.module.css";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import MessageModal from "@/app/MessageModal";

interface QuizQuestion extends DocumentData {
  id: string; // Add question ID for better tracking
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

// Function to shuffle an array using the Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function QuizClient() {
  const params = useSearchParams();
  const router = useRouter();
  const year = params.get("year");
  const courseId = params.get("courseId");
  const lectureId = params.get("lectureId");

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [mcqAnswers, setMcqAnswers] = useState<number[]>([]);
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({});
  const [user, setUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [timeLeft, setTimeLeft] = useState(0);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [isQuizReady, setIsQuizReady] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (quizSubmitted) return;
    setQuizSubmitted(true);

    if (!user || !year || !courseId || !lectureId) {
      setModalMessage("Missing user or quiz details. Please log in.");
      setShowModal(true);
      setQuizSubmitted(false);
      return;
    }

    let correctAnswersCount = 0;
    const submittedMCQAnswers: SubmittedMCQAnswer[] = [];
    const submittedEssayAnswers: SubmittedEssayAnswer[] = [];
    let totalMCQQuestions = 0;
    let mcqQuestionIndex = 0;

    questions.forEach((q) => {
      if (q.type === "mcq") {
        totalMCQQuestions++;
        const isCorrect = mcqAnswers[mcqQuestionIndex] === q.correctAnswerIndex;
        if (isCorrect) correctAnswersCount++;
        submittedMCQAnswers.push({
          question: q.question,
          type: "mcq",
          selectedIndex: mcqAnswers[mcqQuestionIndex],
          selectedText:
            mcqAnswers[mcqQuestionIndex] !== -1
              ? q.options![mcqAnswers[mcqQuestionIndex]]
              : null,
          correctAnswer: q.options![q.correctAnswerIndex!],
          isCorrect,
        });
        mcqQuestionIndex++;
      } else {
        submittedEssayAnswers.push({
          question: q.question,
          type: "essay",
          answerText: essayAnswers[q.id] || "",
        });
      }
    });

    // Save results in Firestore
    const attemptRef = doc(
      db,
      "students",
      user.uid,
      "progress",
      `${year}_${courseId}_${lectureId}`
    );

    await setDoc(
      attemptRef,
      {
        year,
        courseId,
        lectureId,
        score: correctAnswersCount,
        total: totalMCQQuestions,
        answers: {
          mcq: submittedMCQAnswers,
          essay: submittedEssayAnswers,
        },
        completedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const requiredScore = Math.floor(totalMCQQuestions / 2) + 1;
    const quizStateDocRef = doc(
      db,
      "students",
      user.uid,
      "quizAttempts",
      lectureId
    );

    if (correctAnswersCount >= requiredScore) {
      try {
        await deleteDoc(quizStateDocRef);
        await markQuizComplete(
          user.uid,
          year,
          courseId,
          lectureId,
          correctAnswersCount,
          totalMCQQuestions
        );
        await unlockLecture(user.uid, year, courseId, lectureId);
      } catch (error: unknown) {
        console.error("Error completing quiz:", error);
      }
    } else {
      try {
        await deleteDoc(quizStateDocRef);
      } catch (error) {
        console.error("Error deleting quiz attempt doc:", error);
      }
    }

    // ✅ Redirect to results page (results page fetches Firestore, no query needed)
    router.push(
      `/courses/lectures/quiz/results?year=${year}&courseId=${courseId}&lectureId=${lectureId}`
    );
  }, [
    quizSubmitted,
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
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setShowConfirm(false);
    await handleSubmit();
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // This code only runs on the client
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Set initial value on mount
    handleResize();

    // Add and remove event listener for dynamic updates
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty dependency array ensures this runs once on mount

  useEffect(() => {
    const blockContextMenu = (e: MouseEvent) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      if (
        e.key === "PrintScreen" ||
        (e.ctrlKey && e.key === "c") ||
        (e.ctrlKey && e.key === "u") ||
        (e.ctrlKey && e.shiftKey && e.key === "I")
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", blockContextMenu);
    window.addEventListener("keydown", blockKeys);
    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      window.removeEventListener("keydown", blockKeys);
    };
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
          "Missing year, courseId, or lectureId in URL parameters."
        );
        setModalMessage(
          "Missing quiz details. Please navigate from the courses page."
        );
        setShowModal(true);
        setLoading(false);
        return;
      }

      const fetchQuizData = async () => {
        try {
          // 🆕 Check attempt info before starting quiz
          const attemptInfo = await getQuizAttemptInfo(
            currentUser.uid,
            year,
            courseId,
            lectureId
          );

          if (attemptInfo.maxAttemptsReached) {
            setModalMessage(
              "You have reached the maximum number of attempts (3) for this quiz."
            );
            setShowModal(true);
            setLoading(false);
            return;
          }

          const settingsDocRef = doc(
            db,
            `years/${year}/courses/${courseId}/lectures/${lectureId}/quizSettings/duration`
          );
          const docSnap = await getDoc(settingsDocRef);
          let durationMinutes = 10;
          if (docSnap.exists() && typeof docSnap.data().duration === "number") {
            durationMinutes = docSnap.data().duration;
          }
          const durationSeconds = durationMinutes * 60;

          const quizStateDocRef = doc(
            db,
            "students",
            currentUser.uid,
            "quizAttempts",
            lectureId
          );
          const quizStateDocSnap = await getDoc(quizStateDocRef);

          if (quizStateDocSnap.exists()) {
            const data = quizStateDocSnap.data();
            const startTime = data.startTime.toDate();
            const elapsedTime = Math.floor(
              (Date.now() - startTime.getTime()) / 1000
            );
            const remainingTime = durationSeconds - elapsedTime;

            if (remainingTime <= 0) {
              await deleteDoc(quizStateDocRef);
              setModalMessage(
                "Your previous quiz session expired. Starting a new quiz now."
              );
              setShowModal(true);
              setTimeLeft(durationSeconds);
            } else {
              setTimeLeft(remainingTime);
            }
          } else {
            await setDoc(quizStateDocRef, {
              startTime: serverTimestamp(),
              duration: durationSeconds,
            });
            setTimeLeft(durationSeconds);
          }

          // 🆕 Get unused variant and increment attempt with variant tracking
          const selectedVariant = getUnusedQuizVariant(
            attemptInfo.usedVariants
          );
          await incrementQuizAttempt(
            currentUser.uid,
            year,
            courseId,
            lectureId,
            selectedVariant
          );

          const quizRef = collection(
            db,
            `years/${year}/courses/${courseId}/lectures/${lectureId}/${selectedVariant}`
          );
          const essayRef = collection(
            db,
            `years/${year}/courses/${courseId}/lectures/${lectureId}/essayQuestions`
          );

          const quizSnapshot = await getDocs(quizRef);
          const essaySnapshot = await getDocs(essayRef);

          const mcqQuestions = quizSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            type: "mcq",
          })) as QuizQuestion[];

          const essayQuestions = essaySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            type: "essay",
          })) as QuizQuestion[];

          const shuffledMcqQuestions = shuffleArray(mcqQuestions);

          setQuestions([...shuffledMcqQuestions, ...essayQuestions]);
          setMcqAnswers(new Array(shuffledMcqQuestions.length).fill(-1));
          setEssayAnswers({});

          setIsQuizReady(true);
          setLoading(false);
        } catch (error) {
          console.error("Error fetching quiz data:", error);
          setModalMessage("Failed to load quiz. Please try again later.");
          setShowModal(true);
          setLoading(false);
        }
      };

      fetchQuizData();
    });

    return () => unsubscribe();
  }, [year, courseId, lectureId, router]);

  useEffect(() => {
    // We no longer need to check for showResults here
    if (!isQuizReady || quizSubmitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          handleSubmit();
          setModalMessage("Time's up! Your quiz has been submitted.");
          setShowModal(true);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isQuizReady, quizSubmitted, handleSubmit]);

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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const totalMCQQuestions = questions.filter((q) => q.type === "mcq").length;
  const totalEssayQuestions = questions.filter(
    (q) => q.type === "essay"
  ).length;
  const answeredMCQs = mcqAnswers.filter((ans) => ans !== -1).length;
  const answeredEssays = Object.keys(essayAnswers).filter(
    (key) => essayAnswers[key].trim() !== ""
  ).length;

  const totalQuestions = questions.length;
  const solvedQuestions = answeredMCQs + answeredEssays;
  const unsolvedQuestions = totalQuestions - solvedQuestions;

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <p>Loading quiz...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className={styles.wrapper}>
        <h1>Lecture Quiz</h1>
        <hr />
        <p>No quiz questions found for this lecture.</p>
      </div>
    );
  }

  // The rendering logic for results has been moved to a separate page.
  return (
    <div
      className="wrapper"
      style={{
        width: isMobile ? "100%" : "calc(100% - 200px)",
        position: isMobile ? "unset" : "relative",
      }}
    >
      <h1>Lecture Quiz</h1>
      <hr />

      {/* Render MCQ Questions */}
      {questions
        .filter((q) => q.type === "mcq")
        .map((q, i) => (
          <div key={q.id} className={styles.question}>
            <p>
              <strong>
                Q{i + 1}: {q.question}{" "}
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
                    Q{totalMCQQuestions + i + 1}: {q.question}{" "}
                  </strong>
                </p>
                {q.imageUrl && (
                  <div className={styles.quizImageContainer}>
                    <img
                      src={q.imageUrl}
                      alt={`Question ${totalMCQQuestions + i + 1}`}
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
            <h2>Quiz Summary</h2>
            <p>
              Time Left: <strong>{formatTime(timeLeft)}</strong>
            </p>
            <p>
              Total Questions: <strong>{totalQuestions}</strong>
            </p>
            <p>
              Solved: <strong>{solvedQuestions}</strong>
            </p>
            <p>
              Unsolved: <strong>{unsolvedQuestions}</strong>
            </p>
            <hr />
          </div>
          <button
            onClick={handleConfirmSubmit}
            disabled={quizSubmitted}
            style={{ textAlign: "center" }}
          >
            {quizSubmitted ? "Submitting..." : "Submit Quiz"}
          </button>
        </div>
      )}
      <hr className={styles.summaryHr} />

      {showModal && (
        <MessageModal
          message={modalMessage}
          onClose={() => setShowModal(false)}
        />
      )}
      {showConfirm && (
        <ConfirmModal
          message="Are you sure you want to submit?"
          onConfirm={confirmSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
