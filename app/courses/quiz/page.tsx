"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  DocumentData,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { markQuizComplete } from "@/lib/studentProgress"; // Assuming this function exists and is correctly typed
import styles from "../courses.module.css";

// Define an interface for a single quiz question
interface QuizQuestion extends DocumentData {
  question: string;
  options: string[];
  correctAnswerIndex: number; // Added: The index of the correct option
  imageUrl?: string; // Optional image URL for the question
}

// Simple Message Modal Component (re-used from previous versions)
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

export default function QuizPage() {
  const params = useSearchParams();
  const router = useRouter();
  const year = params.get("year");
  const courseId = params.get("courseId");
  const lectureId = params.get("lectureId");

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [studentCode, setStudentCode] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const [timeLeft, setTimeLeft] = useState(0);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [isQuizReady, setIsQuizReady] = useState(false);

  // New states for grading
  const [score, setScore] = useState<number | null>(null); // Stores the final score
  const [showResults, setShowResults] = useState(false); // Controls showing results page

  useEffect(() => {
    const code = localStorage.getItem("studentCode");
    setStudentCode(code);

    if (!year || !courseId || !lectureId) {
      console.error("Missing year, courseId, or lectureId in URL parameters.");
      setModalMessage(
        "Missing quiz details. Please navigate from the courses page."
      );
      setShowModal(true);
      return;
    }

    const fetchQuizData = async () => {
      try {
        // 1. Fetch Quiz Duration
        const settingsDocRef = doc(
          db,
          `years/${year}/courses/${courseId}/lectures/${lectureId}/quizSettings/duration`
        );
        const docSnap = await getDoc(settingsDocRef);
        let durationMinutes = 10;
        if (docSnap.exists() && typeof docSnap.data().duration === "number") {
          durationMinutes = docSnap.data().duration;
        }
        setTimeLeft(durationMinutes * 60);

        // 2. Fetch Quiz Questions
        const quizRef = collection(
          db,
          `years/${year}/courses/${courseId}/lectures/${lectureId}/quizzes`
        );
        const snapshot = await getDocs(quizRef);
        const fetchedQuestions: QuizQuestion[] = snapshot.docs.map(
          (doc) => doc.data() as QuizQuestion
        );
        setQuestions(fetchedQuestions);
        setAnswers(new Array(fetchedQuestions.length).fill(-1)); // Initialize answers

        setIsQuizReady(true);
      } catch (error) {
        console.error("Error fetching quiz data:", error);
        setModalMessage("Failed to load quiz. Please try again later.");
        setShowModal(true);
      }
    };

    fetchQuizData();
  }, [year, courseId, lectureId]);

  // Timer useEffect
  useEffect(() => {
    if (!isQuizReady || quizSubmitted || showResults) return; // Stop timer if quiz is submitted or results are shown

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          if (!quizSubmitted) {
            handleSubmit(); // Automatically submit quiz when time runs out
            setModalMessage("Time's up! Your quiz has been submitted.");
            setShowModal(true);
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isQuizReady, quizSubmitted, showResults]); // Added showResults to dependencies

  const handleChange = (qIndex: number, optionIndex: number) => {
    const updatedAnswers = [...answers];
    updatedAnswers[qIndex] = optionIndex;
    setAnswers(updatedAnswers);
  };

  const handleSubmit = async () => {
    if (quizSubmitted && showResults) {
      // If already submitted and showing results, go back to courses
      router.push("/courses");
      return;
    }

    if (quizSubmitted) return; // Prevent double submission if already in submission process
    setQuizSubmitted(true); // Mark quiz as submitted

    // Calculate score
    let correctAnswersCount = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswerIndex) {
        correctAnswersCount++;
      }
    });

    const currentTotalQuestions = questions.length;

    // Explicitly check if the calculated values are numbers before proceeding
    if (typeof correctAnswersCount !== "number" || isNaN(correctAnswersCount)) {
      console.error(
        "handleSubmit: correctAnswersCount is not a number:",
        correctAnswersCount
      );
      setModalMessage(
        "Internal error: Quiz score calculation failed. Please try again."
      );
      setShowModal(true);
      setQuizSubmitted(false); // Allow retry
      return;
    }
    if (
      typeof currentTotalQuestions !== "number" ||
      isNaN(currentTotalQuestions)
    ) {
      console.error(
        "handleSubmit: totalQuestions is not a number:",
        currentTotalQuestions
      );
      setModalMessage(
        "Internal error: Total questions calculation failed. Please try again."
      );
      setShowModal(true);
      setQuizSubmitted(false); // Allow retry
      return;
    }

    setScore(correctAnswersCount);
    setShowResults(true); // Show results after calculating score

    console.log("studentCode:", studentCode);
    console.log("year:", year);
    console.log("courseId:", courseId);
    console.log("lectureId:", lectureId);
    console.log("Score:", correctAnswersCount); // Log the score

    if (!studentCode || !year || !courseId || !lectureId) {
      setModalMessage(
        "Missing student information or quiz details. Please ensure you are logged in and navigated correctly."
      );
      setShowModal(true);
      setQuizSubmitted(false);
      return;
    }

    try {
      // Pass the score and totalQuestions to markQuizComplete
      await markQuizComplete(
        studentCode,
        year,
        courseId,
        lectureId,
        correctAnswersCount,
        currentTotalQuestions
      );
      setModalMessage(
        `Quiz completed! You scored ${correctAnswersCount} out of ${currentTotalQuestions}. Video unlocked! 🎉`
      );
      setShowModal(true);
      // Removed immediate redirect, user can see results and then click "Back to Courses"
    } catch (error: unknown) {
      console.error("Error completing quiz:", error);
      setModalMessage("Failed to complete quiz. " + (error as Error).message);
      setShowModal(true);
      setQuizSubmitted(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const totalQuestions = questions.length; // This is a state-derived value

  const solvedQuestions = answers.filter((ans) => ans !== -1).length;
  const unsolvedQuestions = totalQuestions - solvedQuestions;

  if (!isQuizReady) {
    return (
      <div className={styles.wrapper}>
        <p>Loading quiz...</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h1>Lecture Quiz</h1>
      <hr className={styles.titleHr} />

      {questions.length === 0 && (
        <p>No quiz questions found for this lecture.</p>
      )}

      {/* Floating Quiz Summary Window */}
      {questions.length > 0 &&
        !showResults && ( // Hide summary when results are shown
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
          </div>
        )}
      <hr className={styles.summaryHr} />

      {showResults ? (
        // Display Quiz Results
        <div className={styles.quizResults}>
          <h2>Quiz Results</h2>
          <p>
            You scored <strong>{score}</strong> out of{" "}
            <strong>{totalQuestions}</strong> questions correctly!
          </p>
          <button
            onClick={() => router.push("/courses")} // Go back to courses
            className="mt-8 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 ease-in-out"
          >
            Back to Courses
          </button>
        </div>
      ) : (
        // Display Quiz Questions
        questions.map((q, i) => (
          <div key={i} className={styles.question}>
            {q.imageUrl && (
              <div className={styles.quizImageContainer}>
                <img
                  src={q.imageUrl}
                  alt={`Question ${i + 1}`}
                  className={styles.quizImage}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://placehold.co/400x200/cccccc/000000?text=Image+Not+Found";
                  }}
                />
              </div>
            )}
            <p>
              <strong>Q{i + 1}:</strong> {q.question}
            </p>
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

      {questions.length > 0 &&
        !showResults && ( // Only show submit button if questions exist and results are not shown
          <button
            onClick={handleSubmit}
            className="mt-8 px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition duration-300 ease-in-out"
            disabled={quizSubmitted}
          >
            {quizSubmitted ? "Submitting..." : "Submit Quiz"}
          </button>
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
