"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { collection, getDocs, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { markQuizComplete } from "@/lib/studentProgress";

export default function QuizPage() {
  const params = useSearchParams();
  const router = useRouter();
  const courseId = params.get("courseId");
  const lectureIndex = params.get("lectureIndex");

  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [studentCode, setStudentCode] = useState<string | null>(null);

  useEffect(() => {
    const code = localStorage.getItem("studentCode");
    setStudentCode(code);

    if (!courseId || !lectureIndex) return;

    const fetchQuestions = async () => {
      const quizRef = collection(
        db,
        "courses",
        courseId,
        "lectures",
        lectureIndex,
        "quizzes"
      );
      const snapshot = await getDocs(quizRef);
      const fetched = snapshot.docs.map((doc) => doc.data());
      setQuestions(fetched);
      setAnswers(new Array(fetched.length).fill(-1));
    };

    fetchQuestions();
  }, [courseId, lectureIndex]);

  const handleChange = (qIndex: number, optionIndex: number) => {
    const updated = [...answers];
    updated[qIndex] = optionIndex;
    setAnswers(updated);
  };

  const handleSubmit = async () => {
    console.log("studentCode:", studentCode);
    console.log("courseId:", courseId);
    console.log("lectureIndex:", lectureIndex);

    if (!studentCode || !courseId || lectureIndex === null) {
      alert("Missing info");
      return;
    }

    await markQuizComplete(studentCode, courseId, Number(lectureIndex));
    alert("Quiz completed. Video unlocked.");
    router.push("/courses");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Lecture Quiz</h1>

      {questions.length === 0 && <p>No quiz questions found.</p>}

      {questions.map((q, i) => (
        <div key={i} style={{ marginBottom: "1rem" }}>
          <p>
            <strong>Q{i + 1}:</strong> {q.question}
          </p>
          {q.options.map((opt: string, j: number) => (
            <label key={j} style={{ display: "block", marginLeft: "1rem" }}>
              <input
                type="radio"
                name={`q-${i}`}
                checked={answers[i] === j}
                onChange={() => handleChange(i, j)}
              />
              {opt}
            </label>
          ))}
        </div>
      ))}

      {questions.length > 0 && <button onClick={handleSubmit}>Submit</button>}
    </div>
  );
}
