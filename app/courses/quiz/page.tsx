"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  DocumentData,
  doc,
  getDoc,
} from "firebase/firestore"; // Added doc and getDoc
import { db } from "@/lib/firebase";
import { markQuizComplete } from "@/lib/studentProgress"; // Assuming this function exists and is correctly typed
import styles from "../courses.module.css";

// Define an interface for a single quiz question (removed 'time' property)
interface QuizQuestion extends DocumentData {
  question: string;
  options: string[];
  // 'time' property is no longer here, as it's stored centrally in quizSettings
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
  const courseId = params.get("courseId");
  const lectureIndex = params.get("lectureIndex");

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [studentCode, setStudentCode] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // Quiz Timer State
  // Initialize timeLeft to 0, it will be updated once quiz duration is fetched
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizSubmitted, setQuizSubmitted] = useState(false); // To prevent multiple submissions
  const [isQuizReady, setIsQuizReady] = useState(false); // New state to indicate if quiz data and duration are loaded

  useEffect(() => {
    const code = localStorage.getItem("studentCode");
    setStudentCode(code);

    if (!courseId || lectureIndex === null) {
      console.error("Missing courseId or lectureIndex in URL parameters.");
      setModalMessage(
        "Missing quiz details. Please navigate from the courses page."
      );
      setShowModal(true);
      return;
    }

    const fetchQuizData = async () => {
      try {
        // 1. Fetch Quiz Duration from the centralized quizSettings document
        const settingsDocRef = doc(
          db,
          `courses/${courseId}/lectures/${lectureIndex}/quizSettings/duration`
        );
        const docSnap = await getDoc(settingsDocRef);
        let durationMinutes = 10; // Default to 10 minutes if not found
        if (docSnap.exists() && typeof docSnap.data().duration === "number") {
          durationMinutes = docSnap.data().duration;
        }
        setTimeLeft(durationMinutes * 60); // Convert minutes to seconds

        // 2. Fetch Quiz Questions
        const quizRef = collection(
          db,
          "courses",
          courseId,
          "lectures",
          lectureIndex,
          "quizzes"
        );
        const snapshot = await getDocs(quizRef);
        const fetchedQuestions: QuizQuestion[] = snapshot.docs.map(
          (doc) => doc.data() as QuizQuestion
        );
        setQuestions(fetchedQuestions);
        setAnswers(new Array(fetchedQuestions.length).fill(-1));

        setIsQuizReady(true); // Mark quiz as ready after fetching both duration and questions
      } catch (error) {
        console.error("Error fetching quiz data:", error);
        setModalMessage("Failed to load quiz. Please try again later.");
        setShowModal(true);
      }
    };

    fetchQuizData();
  }, [courseId, lectureIndex]);

  // Timer useEffect
  useEffect(() => {
    // Only start timer if quiz is ready and not yet submitted
    if (!isQuizReady || quizSubmitted) return;

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

    // Cleanup interval on component unmount or if quiz is submitted
    return () => clearInterval(timer);
  }, [timeLeft, isQuizReady, quizSubmitted]); // Re-run if timeLeft, isQuizReady, or quizSubmitted changes

  const handleChange = (qIndex: number, optionIndex: number) => {
    const updatedAnswers = [...answers];
    updatedAnswers[qIndex] = optionIndex;
    setAnswers(updatedAnswers);
  };

  const handleSubmit = async () => {
    if (quizSubmitted) return; // Prevent double submission
    setQuizSubmitted(true); // Mark quiz as submitted

    console.log("studentCode:", studentCode);
    console.log("courseId:", courseId);
    console.log("lectureIndex:", lectureIndex);

    if (!studentCode || !courseId || lectureIndex === null) {
      setModalMessage(
        "Missing student information or quiz details. Please ensure you are logged in and navigated correctly."
      );
      setShowModal(true);
      setQuizSubmitted(false); // Allow resubmission if info is missing
      return;
    }

    try {
      await markQuizComplete(studentCode, courseId, Number(lectureIndex));
      setModalMessage("Quiz completed. Video unlocked! 🎉");
      setShowModal(true);
      setTimeout(() => {
        router.push("/courses");
      }, 1500);
    } catch (error: unknown) {
      console.error("Error completing quiz:", error);
      setModalMessage("Failed to complete quiz. " + (error as Error).message);
      setShowModal(true);
      setQuizSubmitted(false); // Allow resubmission on error
    }
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Calculate question statistics
  const totalQuestions = questions.length;
  const solvedQuestions = answers.filter((ans) => ans !== -1).length;
  const unsolvedQuestions = totalQuestions - solvedQuestions;

  // Show loading state until quiz data and duration are ready
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
      {questions.length > 0 && (
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
          <hr />
          <button
            onClick={handleSubmit}
            className="mt-8 px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition duration-300 ease-in-out"
            disabled={quizSubmitted} // Disable button after submission
          >
            {quizSubmitted ? "Submitting..." : "Submit Quiz"}
          </button>
        </div>
      )}
      <hr className={styles.summaryHr} />

      {questions.map((q, i) => (
        <div key={i} className={styles.question}>
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
      ))}

      {showModal && (
        <MessageModal
          message={modalMessage}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
