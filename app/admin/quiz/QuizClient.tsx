"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  collection,
  addDoc,
  getDocs,
  DocumentData,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import styles from "../admin.module.css";

// Re-using the MessageModalProps interface and MessageModal component
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

// Interface for existing quiz question data
interface ExistingQuiz extends DocumentData {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  imageUrl?: string; // New: Optional image URL for the question
}

export default function QuizBuilder() {
  const searchParams = useSearchParams();
  const year = searchParams.get("year");
  const courseId = searchParams.get("courseId");
  const lectureId = searchParams.get("lectureId");

  const [question, setQuestion] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // New state for image URL
  const [quizDurationInput, setQuizDurationInput] = useState<number | "">("");
  const [currentQuizDuration, setCurrentQuizDuration] = useState<number | null>(
    null
  );
  const [isDurationLoading, setIsDurationLoading] = useState(true);

  const [options, setOptions] = useState(["", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(
    null
  );
  const [existingQuizzes, setExistingQuizzes] = useState<ExistingQuiz[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // --- Quiz Duration Management ---
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
      setModalMessage("Quiz duration saved successfully!");
      setShowModal(true);
    } catch (error: unknown) {
      console.error("Error saving quiz duration:", error);
      setModalMessage(
        "Failed to save quiz duration: " + (error as Error).message
      );
      setShowModal(true);
    }
  };

  useEffect(() => {
    fetchQuizDuration();
    fetchQuizzes();
  }, [year, courseId, lectureId]);

  // --- Question Management ---
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

  const handleSubmit = async () => {
    if (currentQuizDuration === null) {
      setModalMessage("Please set the overall quiz duration first.");
      setShowModal(true);
      return;
    }

    if (
      !question.trim() ||
      options.some((opt) => !opt.trim()) ||
      correctAnswerIndex === null
    ) {
      setModalMessage(
        "Please fill all question fields, ensure options are not empty, and select a correct answer."
      );
      setShowModal(true);
      return;
    }

    if (!year || !courseId || !lectureId) {
      setModalMessage(
        "Missing course, lecture, or year information. Please ensure you navigate from the correct admin page."
      );
      setShowModal(true);
      return;
    }

    try {
      const quizQuestionsRef = collection(
        db,
        `years/${year}/courses/${courseId}/lectures/${lectureId}/quizzes`
      );

      await addDoc(quizQuestionsRef, {
        question,
        options,
        correctAnswerIndex,
        imageUrl: imageUrl.trim() || null, // New: Save imageUrl, if empty string, save as null
      });

      setModalMessage("Quiz question saved successfully!");
      setShowModal(true);

      // Reset form fields
      setQuestion("");
      setImageUrl(""); // Reset image URL field
      setOptions(["", ""]);
      setCorrectAnswerIndex(null);
      fetchQuizzes();
    } catch (error: unknown) {
      console.error("Error adding quiz question:", error);
      setModalMessage(
        "Failed to save quiz question: " + (error as Error).message
      );
      setShowModal(true);
    }
  };

  const fetchQuizzes = async () => {
    if (!year || !courseId || !lectureId) return;
    try {
      const quizQuestionsRef = collection(
        db,
        `years/${year}/courses/${courseId}/lectures/${lectureId}/quizzes`
      );
      const snapshot = await getDocs(quizQuestionsRef);
      const quizzes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ExistingQuiz[];
      setExistingQuizzes(quizzes);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      setModalMessage("Failed to fetch existing quizzes.");
      setShowModal(true);
    }
  };

  if (!year || !courseId || !lectureId) {
    return (
      <div className={styles.wrapper}>
        <p>
          Missing year, course, or lecture info in URL. Please navigate from the
          admin course/lecture selection.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <h1>Add Quiz Question</h1>
      <p>
        <strong>Year:</strong> {year.toUpperCase()} |{" "}
        <strong>Course ID:</strong> {courseId} | <strong>Lecture ID:</strong>{" "}
        {lectureId}
      </p>

      {/* Quiz Duration Section */}
      <div className={styles.quizDurationSection}>
        <h2>Quiz Duration</h2>
        {isDurationLoading ? (
          <p>Loading duration...</p>
        ) : currentQuizDuration === null ? (
          <>
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
            />
            <button type="button" onClick={saveQuizDuration}>
              Set Duration
            </button>
          </>
        ) : (
          <>
            <p>
              Current Quiz Duration:{" "}
              <strong>{currentQuizDuration} minutes</strong>
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                marginTop: "1rem",
              }}
            >
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
              <button type="button" onClick={saveQuizDuration}>
                Save New Duration
              </button>
            </div>
          </>
        )}
      </div>

      <hr style={{ margin: "2rem 0" }} />

      {/* Add Question Section */}
      <h2>Add New Question</h2>
      <div className={styles.form}>
        <textarea
          placeholder="Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        {/* New input for Image URL */}
        <input
          type="url"
          placeholder="Image URL (optional)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        {options.map((option, index) => (
          <div
            key={index}
            style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
          >
            <input
              type="text"
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
            />
            <input
              type="radio"
              name="correct"
              checked={correctAnswerIndex === index}
              onChange={() => setCorrectAnswerIndex(index)}
            />
            <label>Correct</label>
            {options.length > 2 && (
              <button type="button" onClick={() => removeOption(index)}>
                🗑️
              </button>
            )}
          </div>
        ))}
        {options.length < 4 && (
          <button type="button" onClick={addOption}>
            ➕ Add Option
          </button>
        )}
        <button type="button" onClick={handleSubmit}>
          ✅ Save Question
        </button>
      </div>

      <hr style={{ margin: "2rem 0" }} />

      <h2>Existing Questions</h2>
      {existingQuizzes.length > 0 ? (
        <ul>
          {existingQuizzes.map((quiz, idx) => (
            <li key={quiz.id}>
              {idx + 1}. {quiz.question}
              {quiz.imageUrl && (
                <div className={styles.quizImageContainer}>
                  <img
                    src={quiz.imageUrl}
                    alt={`Question ${idx + 1}`}
                    className={styles.quizImage}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No questions added yet.</p>
      )}
      <hr style={{ margin: "2rem 0" }} />
      {showModal && (
        <MessageModal
          message={modalMessage}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
