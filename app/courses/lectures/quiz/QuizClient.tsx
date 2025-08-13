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

interface QuizQuestion extends DocumentData {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  imageUrl?: string;
}

interface MessageModalProps {
  message: string;
  onClose: () => void;
}

const MessageModal: React.FC<MessageModalProps> = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
        <p className="text-lg font-semibold mb-4">{message}</p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          OK
        </button>
      </div>
    </div>
  );
};

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

    // 🌟 Unified Logic: Attempt to delete the timer document immediately 🌟
    try {
      await deleteDoc(quizStateDocRef);
    } catch (error) {
      console.error("Error deleting quiz attempt document:", error);
    }

    if (correctAnswersCount >= requiredScore) {
      try {
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
      setModalMessage(
        `You failed the quiz with a score of ${correctAnswersCount} out of ${currentTotalQuestions}. You need at least ${requiredScore} correct answers to pass. Please try again.`
      );
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
              setModalMessage("Time's up! The quiz has already ended.");
              setShowModal(true);
              setLoading(false);
              setQuizSubmitted(true);
              setShowResults(true);
              setScore(0);
              return;
            }
            setTimeLeft(remainingTime);
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
    if (!isQuizReady || quizSubmitted || showResults || loading) return;

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
  }, [isQuizReady, quizSubmitted, showResults, handleSubmit, loading]);

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

      {questions.length > 0 && !showResults && (
        <div className={styles.quizSummaryFloating}>
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
          <button
            onClick={handleSubmit}
            className="mt-8 px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition duration-300 ease-in-out"
            disabled={quizSubmitted}
          >
            {quizSubmitted ? "Submitting..." : "Submit Quiz"}
          </button>
        </div>
      )}
      <hr className={styles.summaryHr} />

      {showResults ? (
        <div className={styles.quizResults}>
          <h2>Quiz Results</h2>
          <p>
            You scored <strong>{score}</strong> out of{" "}
            <strong>{totalQuestions}</strong> questions correctly!
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
