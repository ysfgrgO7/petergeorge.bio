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
import { markQuizComplete, unlockLecture } from "@/lib/studentProgress";
import styles from "../../courses.module.css";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import MessageModal from "@/app/MessageModal";

interface QuizQuestion extends DocumentData {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  imageUrl?: string;
}

export default function QuizClient() {
  const params = useSearchParams();
  const router = useRouter();
  const year = params.get("year");
  const courseId = params.get("courseId");
  const lectureId = params.get("lectureId");

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [timeLeft, setTimeLeft] = useState(0);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [isQuizReady, setIsQuizReady] = useState(false);

  const [score, setScore] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);

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
    questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswerIndex) {
        correctAnswersCount++;
      }
    });

    const currentTotalQuestions = questions.length;
    setScore(correctAnswersCount);
    setShowResults(true);

    const requiredScore = Math.ceil(currentTotalQuestions / 2 + 1);
    const quizStateDocRef = doc(
      db,
      `studentProgress/${user.uid}/quizAttempts/${lectureId}`
    );

    if (correctAnswersCount >= requiredScore) {
      // User passed: delete the timer document and update progress
      try {
        await deleteDoc(quizStateDocRef);
        await markQuizComplete(
          user.uid,
          year,
          courseId,
          lectureId,
          correctAnswersCount,
          currentTotalQuestions
        );
        await unlockLecture(user.uid, year, courseId, lectureId);
        setModalMessage(
          `Quiz completed! You scored ${correctAnswersCount} out of ${currentTotalQuestions}. Video unlocked! 🎉`
        );
      } catch (error: unknown) {
        console.error("Error completing quiz:", error);
        setModalMessage("Failed to complete quiz. " + (error as Error).message);
      }
    } else {
      // User failed: delete the timer document to allow a new attempt
      try {
        await deleteDoc(quizStateDocRef);
        setModalMessage(
          `You failed the quiz with a score of ${correctAnswersCount} out of ${currentTotalQuestions}. You need at least ${requiredScore} correct answers to pass. Please Retake it.`
        );
      } catch (error) {
        console.error(
          "Error deleting quiz attempt document after failure:",
          error
        );
        setModalMessage(
          "Quiz failed, but there was an error resetting your progress. Please try again."
        );
      }
    }

    setShowModal(true);
    setQuizSubmitted(false);
  }, [
    quizSubmitted,
    questions,
    answers,
    user,
    year,
    courseId,
    lectureId,
    router,
  ]);

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
            `studentProgress/${currentUser.uid}/quizAttempts/${lectureId}`
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
              // Time has expired, delete the old document to start a new quiz
              await deleteDoc(quizStateDocRef);
              setModalMessage(
                "Your previous quiz session expired. Starting a new quiz now."
              );
              setShowModal(true);
              setTimeLeft(durationSeconds); // Reset timer for a new attempt
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

          const quizRef = collection(
            db,
            `years/${year}/courses/${courseId}/lectures/${lectureId}/quizzes`
          );
          const snapshot = await getDocs(quizRef);
          const fetchedQuestions: QuizQuestion[] = snapshot.docs.map(
            (doc) => doc.data() as QuizQuestion
          );
          setQuestions(fetchedQuestions);
          setAnswers(new Array(fetchedQuestions.length).fill(-1));

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
    if (!isQuizReady || quizSubmitted || showResults) return;
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
  }, [isQuizReady, quizSubmitted, showResults, handleSubmit]); // Remove loading from dependencies
  const handleChange = (qIndex: number, optionIndex: number) => {
    const updatedAnswers = [...answers];
    updatedAnswers[qIndex] = optionIndex;
    setAnswers(updatedAnswers);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const totalQuestions = questions.length;
  const solvedQuestions = answers.filter((ans) => ans !== -1).length;
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
        <hr className={styles.titleHr} />
        <p>No quiz questions found for this lecture.</p>
        {showModal && (
          <MessageModal
            message={modalMessage}
            onClose={() => {
              setShowModal(false);
              router.push(`/courses?year=${year}`);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h1>Lecture Quiz</h1>
      <hr className={styles.titleHr} />

      {showResults ? (
        <div>
          <h2>Quiz Results</h2>
          <p style={{ marginBottom: "10px" }}>
            You scored{" "}
            <strong
              style={{
                color: "var(--white)",
                padding: "7px",
                borderRadius: "5px",
                backgroundColor:
                  score !== null && score >= Math.ceil(questions.length / 2 + 1)
                    ? "var(--green)"
                    : "var(--red)",
              }}
            >
              {score}/{totalQuestions}
            </strong>{" "}
            questions correctly!
          </p>
          <button
            onClick={() => router.push("/courses")}
            className="mt-8 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 ease-in-out"
          >
            Back to Courses
          </button>
        </div>
      ) : (
        questions.map((q, i) => (
          <div key={i} className={styles.question}>
            {questions.length > 0 && !showResults && (
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
                  <hr className={styles.titleHr} />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={quizSubmitted}
                  style={{ textAlign: "center" }}
                >
                  {quizSubmitted ? "Submitting..." : "Submit Quiz"}
                </button>
              </div>
            )}
            <hr className={styles.summaryHr} />
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
            {q.options.map((opt: string, j: number) => (
              <label
                key={j}
                className={`${styles.choices} ${
                  answers[i] === j ? styles.selectedChoice : ""
                }`}
              >
                <input
                  type="radio"
                  name={`q-${i}`}
                  checked={answers[i] === j}
                  onChange={() => handleChange(i, j)}
                />
                {opt}
              </label>
            ))}
            <hr />
          </div>
        ))
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
