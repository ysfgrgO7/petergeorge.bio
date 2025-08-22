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
import MessageModal from "@/app/MessageModal";

// Interfaces
interface ExistingQuiz extends DocumentData {
  id: string;
  question: string;
  options?: string[];
  correctAnswerIndex?: number;
  imageUrl?: string;
}

export default function QuizBuilder() {
  const searchParams = useSearchParams();
  const year = searchParams.get("year");
  const courseId = searchParams.get("courseId");
  const lectureId = searchParams.get("lectureId");

  // --- MCQ state ---
  const [question, setQuestion] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(
    null
  );
  const [existingQuizzes, setExistingQuizzes] = useState<ExistingQuiz[]>([]);

  // --- Essay state ---
  const [essayQuestion, setEssayQuestion] = useState("");
  const [essayImageUrl, setEssayImageUrl] = useState("");
  const [existingEssays, setExistingEssays] = useState<ExistingQuiz[]>([]);

  // --- Duration state ---
  const [quizDurationInput, setQuizDurationInput] = useState<number | "">("");
  const [currentQuizDuration, setCurrentQuizDuration] = useState<number | null>(
    null
  );
  const [isDurationLoading, setIsDurationLoading] = useState(true);

  // --- UI state ---
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // --- Duration logic (same as before) ---
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

  // --- Fetch quizzes ---
  const fetchQuizzes = async () => {
    if (!year || !courseId || !lectureId) return;
    try {
      // MCQs
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

      // Essays
      const essayRef = collection(
        db,
        `years/${year}/courses/${courseId}/lectures/${lectureId}/essayQuestions`
      );
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
    fetchQuizDuration();
    fetchQuizzes();
  }, [year, courseId, lectureId]);

  // --- MCQ handlers ---
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

  const handleMCQSubmit = async () => {
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
        "Please complete all MCQ fields and select a correct answer."
      );
      setShowModal(true);
      return;
    }
    if (!year || !courseId || !lectureId) {
      setModalMessage("Missing course, lecture, or year information.");
      setShowModal(true);
      return;
    }
    try {
      const quizQuestionsRef = collection(
        db,
        `years/${year}/courses/${courseId}/lectures/${lectureId}/quizzes`
      );
      await addDoc(quizQuestionsRef, {
        type: "mcq",
        question,
        options,
        correctAnswerIndex,
        imageUrl: imageUrl.trim() || null,
      });
      setModalMessage("MCQ saved successfully!");
      setShowModal(true);
      setQuestion("");
      setImageUrl("");
      setOptions(["", ""]);
      setCorrectAnswerIndex(null);
      fetchQuizzes();
    } catch (error: unknown) {
      console.error("Error adding MCQ:", error);
      setModalMessage("Failed to save MCQ: " + (error as Error).message);
      setShowModal(true);
    }
  };

  // --- Essay handlers ---
  const handleEssaySubmit = async () => {
    if (currentQuizDuration === null) {
      setModalMessage("Please set the overall quiz duration first.");
      setShowModal(true);
      return;
    }
    if (!essayQuestion.trim()) {
      setModalMessage("Please enter an essay question.");
      setShowModal(true);
      return;
    }
    if (!year || !courseId || !lectureId) {
      setModalMessage("Missing course, lecture, or year information.");
      setShowModal(true);
      return;
    }
    try {
      const essayRef = collection(
        db,
        `years/${year}/courses/${courseId}/lectures/${lectureId}/essayQuestions`
      );
      await addDoc(essayRef, {
        type: "essay",
        question: essayQuestion,
        imageUrl: essayImageUrl.trim() || null,
      });
      setModalMessage("Essay question saved successfully!");
      setShowModal(true);
      setEssayQuestion("");
      setEssayImageUrl("");
      fetchQuizzes();
    } catch (error: unknown) {
      console.error("Error adding essay question:", error);
      setModalMessage(
        "Failed to save essay question: " + (error as Error).message
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

      {/* Add MCQ */}
      <h2>Add MCQ</h2>
      <textarea
        placeholder="Question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        style={{ marginBottom: "10px" }}
      />
      <input
        type="url"
        style={{ marginBottom: "10px" }}
        placeholder="Image URL (optional)"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />
      {options.map((opt, idx) => (
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
      {options.length < 5 && <button onClick={addOption}>➕ Add Option</button>}
      <button style={{ marginLeft: "10px" }} onClick={handleMCQSubmit}>
        ✅ Save MCQ
      </button>

      <hr />

      {/* Add Essay */}
      <h2>Add Essay Question</h2>
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
      <button onClick={handleEssaySubmit}>✅ Save Essay</button>

      <hr />

      {/* Display Existing */}
      <h2>Existing MCQs</h2>
      {existingQuizzes.length ? (
        <ul>
          {existingQuizzes.map((q, i) => (
            <li key={q.id}>
              {i + 1}. {q.question}
            </li>
          ))}
        </ul>
      ) : (
        <p>No MCQs yet.</p>
      )}

      <h2>Existing Essays</h2>
      {existingEssays.length ? (
        <ul>
          {existingEssays.map((q, i) => (
            <li key={q.id}>
              {i + 1}. {q.question}
            </li>
          ))}
        </ul>
      ) : (
        <p>No essays yet.</p>
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
