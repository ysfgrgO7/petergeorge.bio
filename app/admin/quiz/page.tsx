"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import styles from "../admin.module.css";

export default function QuizBuilder() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const lectureIndex = searchParams.get("lectureIndex");

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(
    null
  );
  const [existingQuizzes, setExistingQuizzes] = useState<any[]>([]);

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = async () => {
    if (
      !question ||
      options.some((opt) => !opt) ||
      correctAnswerIndex === null
    ) {
      alert("Fill all fields");
      return;
    }

    const quizRef = collection(
      db,
      `courses/${courseId}/lectures/${lectureIndex}/quizzes`
    );

    await addDoc(quizRef, {
      question,
      options,
      correctAnswerIndex,
    });

    setQuestion("");
    setOptions(["", ""]);
    setCorrectAnswerIndex(null);
    fetchQuizzes();
  };

  const fetchQuizzes = async () => {
    if (!courseId || lectureIndex === null) return;
    const quizRef = collection(
      db,
      `courses/${courseId}/lectures/${lectureIndex}/quizzes`
    );
    const snapshot = await getDocs(quizRef);
    const quizzes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setExistingQuizzes(quizzes);
  };

  useEffect(() => {
    fetchQuizzes();
  }, [courseId, lectureIndex]);

  if (!courseId || lectureIndex === null) {
    return <p>Missing course or lecture info in URL.</p>;
  }

  return (
    <div className={styles.wrapper}>
      <h1>Add Quiz Question</h1>
      <p>
        <strong>Course ID:</strong> {courseId} | <strong>Lecture:</strong> #
        {lectureIndex + 1} 
      </p>

      <div className={styles.form}>
        <input
          type="text"
          placeholder="Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        {options.map((option, index) => (
          <div key={index} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
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
              <button onClick={() => removeOption(index)}>🗑️</button>
            )}
          </div>
        ))}

        {options.length < 4 && (
          <button onClick={addOption}>➕ Add Option</button>
        )}

        <button onClick={handleSubmit}>✅ Save Question</button>
      </div>

      <hr style={{ margin: "2rem 0" }} />

      <h2>Existing Questions</h2>
      {existingQuizzes.length > 0 ? (
        <ul>
          {existingQuizzes.map((quiz, idx) => (
            <li key={quiz.id}>
              {idx + 1}. {quiz.question}
            </li>
          ))}
        </ul>
      ) : (
        <p>No questions added yet.</p>
      )}
    </div>
  );
}
