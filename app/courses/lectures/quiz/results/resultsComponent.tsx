// QuizResults.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import styles from "../../../courses.module.css";
import Loading from "@/app/components/Loading";

interface StudentData {
  studentCode?: string;
  firstName?: string;
  secondName?: string;
  system?: "center" | "online";
}

interface MCQAnswer {
  question: string;
  correctAnswer: string;
  selectedText: string | null;
  selectedIndex: number;
  isCorrect: boolean;
  marks: number;
  type: "mcq";
}

interface EssayAnswer {
  question: string;
  answerText: string;
  marks: number;
  type: "essay";
}

interface QuizAnswers {
  mcq: MCQAnswer[];
  essay: { [key: string]: EssayAnswer };
}

interface LectureData {
  title?: string;
  odyseeName?: string;
  odyseeId?: string;
}

export default function QuizResults() {
  const router = useRouter();
  const params = useSearchParams();
  const year = params.get("year");
  const courseId = params.get("courseId");
  const lectureId = params.get("lectureId");

  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [earnedMarks, setEarnedMarks] = useState<number | null>(null);
  const [totalPossibleMarks, setTotalPossibleMarks] = useState<number | null>(
    null,
  );
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers | null>(null);
  const [lectureData, setLectureData] = useState<LectureData | null>(null);

  // Function to get lecture URL
  const getCourseUrl = () => {
    if (!year || !courseId || !lectureId || !lectureData) {
      return "/courses";
    }

    const baseParams = `year=${year}&courseId=${courseId}`;
    // http://localhost:3000/courses/lectures?year=year1&courseId=RKr56CGDm3bkRIdY3OqY

    if (lectureData.odyseeName && lectureData.odyseeId && lectureData.title) {
      return `/courses/lectures?${baseParams}`;
    }

    // Fallback to lectures page if we don't have all the needed data
    return `/courses/lectures?year=${year}&courseId=${courseId}`;
  };

  const handleBackToCourse = () => {
    const lectureUrl = getCourseUrl();
    router.push(lectureUrl);
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);

      // Fetch student data to get student code and system
      let currentStudentData: StudentData | null = null;
      try {
        const studentDocRef = doc(db, "students", currentUser.uid);
        const studentDocSnap = await getDoc(studentDocRef);
        if (studentDocSnap.exists()) {
          currentStudentData = studentDocSnap.data() as StudentData;
          setStudentData(currentStudentData);
        }
      } catch (error) {
        console.error("Error fetching student data:", error);
      }

      if (year && courseId && lectureId) {
        try {
          // Fetch the lecture document
          const lectureDocRef = doc(
            db,
            `years/${year}/courses/${courseId}/lectures/${lectureId}`,
          );
          const lectureDocSnap = await getDoc(lectureDocRef);

          if (lectureDocSnap.exists()) {
            const lectureData = lectureDocSnap.data();

            // Store lecture data for URL construction
            setLectureData({
              title: lectureData.title,
              odyseeName: lectureData.odyseeName,
              odyseeId: lectureData.odyseeId,
            });

            // Check system-specific enabled status
            let isLectureEnabled = true;

            if (currentStudentData?.system) {
              if (currentStudentData.system === "center") {
                isLectureEnabled = lectureData?.isEnabledCenter !== false;
              } else if (currentStudentData.system === "online") {
                isLectureEnabled = lectureData?.isEnabledOnline !== false;
              }
            }
            if (!isLectureEnabled) {
              setIsExpired(true);
            }
          }
        } catch (error) {
          console.error("Error fetching lecture data:", error);
        }
      }

      // Fetch quiz results and answers
      if (year && courseId && lectureId) {
        try {
          const resultRef = doc(
            db,
            "students",
            currentUser.uid,
            "progress",
            `${year}_${courseId}_${lectureId}`,
          );
          const resultSnap = await getDoc(resultRef);
          if (resultSnap.exists()) {
            const data = resultSnap.data();
            setEarnedMarks(data.earnedMarks ?? null);
            setTotalPossibleMarks(data.totalPossibleMarks ?? null);

            // Set quiz answers if they exist
            if (data.answers) {
              setQuizAnswers(data.answers as QuizAnswers);
            }
          }
        } catch (error) {
          console.error("Error fetching quiz results:", error);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, year, courseId, lectureId]);

  const renderMCQAnswers = () => {
    if (!quizAnswers?.mcq || quizAnswers.mcq.length === 0) return null;

    return (
      <div style={{ marginBottom: "30px" }}>
        <h3 className={styles.Title}>Multiple Choice Questions</h3>
        {quizAnswers.mcq.map((answer, index) => (
          <div key={index} className={styles.questionCard}>
            <h4
              style={{
                marginBottom: "15px",
                fontWeight: "600",
                backgroundColor: "var(--light)",
                color: "var(--black)",
                padding: "0.5rem",
                borderRadius: "5px",
              }}
            >
              Question {index + 1}
            </h4>
            <h2 style={{ marginBottom: "15px", lineHeight: "1.6" }}>
              {answer.question}
            </h2>
            <div style={{ marginBottom: "10px" }}>
              <strong>Your Answer: </strong>
              <span
                style={{
                  color: answer.isCorrect ? "var(--green)" : "var(--red)",
                  fontWeight: "600",
                }}
              >
                {answer.selectedText || "No answer selected"}
              </span>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <strong>Correct Answer: </strong>
              <span style={{ color: "var(--green)", fontWeight: "600" }}>
                {answer.correctAnswer}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "14px",
                  fontWeight: "600",
                  backgroundColor: answer.isCorrect
                    ? "var(--green)"
                    : "var(--red)",
                  color: "white",
                }}
              >
                {answer.isCorrect ? "Correct" : "Incorrect"}
              </div>

              <div
                style={{
                  display: "inline-block",
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "14px",
                  fontWeight: "600",
                  backgroundColor: "var(--dark)",
                  color: "white",
                }}
              >
                {answer.marks} mark {answer.marks !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderEssayAnswers = () => {
    if (!quizAnswers?.essay || Object.keys(quizAnswers.essay).length === 0)
      return null;

    return (
      <div style={{ marginBottom: "30px" }}>
        <h3 className={styles.Title}>Essay Questions</h3>
        {Object.entries(quizAnswers.essay).map(([key, answer], index) => (
          <div key={key} className={styles.questionCard}>
            <h4
              style={{
                marginBottom: "15px",
                fontWeight: "600",
                backgroundColor: "var(--light)",
                color: "var(--black)",
                padding: "0.5rem",
                borderRadius: "5px",
              }}
            >
              Essay Question {index + 1}
            </h4>
            <h2 style={{ marginBottom: "15px", lineHeight: "1.6" }}>
              {answer.question}
            </h2>

            <div style={{ marginBottom: "10px" }}>
              <strong>Your Answer:</strong>
            </div>
            <div
              style={{
                padding: "15px",
                backgroundColor: "var(--input-bg)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
                marginBottom: "15px",
              }}
            >
              {answer.answerText}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "14px",
                  fontWeight: "600",
                  backgroundColor: "var(--dark)",
                  color: "white",
                }}
              >
                {answer.marks} mark{answer.marks !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return <Loading text="Loading results..." />;
  }

  if (earnedMarks === null || totalPossibleMarks === null) {
    return (
      <div className={styles.wrapper}>
        <h1>Quiz Results</h1>
        <p>No results found. Please complete the quiz first.</p>
        <button
          onClick={handleBackToCourse}
          className="mt-8 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 ease-in-out"
        >
          Back to Course
        </button>
      </div>
    );
  }

  const requiredScore = Math.floor(totalPossibleMarks / 2) + 1;
  const passed = earnedMarks >= requiredScore;

  return (
    <div className={styles.wrapper}>
      <br />
      <button
        onClick={handleBackToCourse}
        className="mt-8 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 ease-in-out"
      >
        Back to Course
      </button>
      <br />
      <br />
      <h1>Quiz Results</h1>
      <hr />
      <h2>Quiz Submitted!</h2>
      <p style={{ marginBottom: "10px" }}>
        You scored{" "}
        <strong
          style={{
            color: "var(--bg)",
            padding: "7px",
            borderRadius: "5px",
            backgroundColor: passed ? "var(--green)" : "var(--red)",
          }}
        >
          {earnedMarks}/{totalPossibleMarks}
        </strong>{" "}
        questions correctly on the multiple-choice section!
      </p>
      <p style={{ marginBottom: "10px" }}>
        Your essay questions will be graded separately. Check Your Progress page
        for updates.
      </p>

      {isExpired ? (
        <>
          <hr />
          <h2 style={{ marginBottom: "20px" }}>
            Your answers are now available for review:
          </h2>

          {quizAnswers ? (
            <div>
              {renderMCQAnswers()}
              {renderEssayAnswers()}
            </div>
          ) : (
            <p style={{ fontStyle: "italic", color: "var(--text-muted)" }}>
              No answer details available.
            </p>
          )}
        </>
      ) : (
        <div>
          <h2 style={{ marginBottom: "0.5rem" }}>
            You will be able to see your answers after the Lecture Expiration
          </h2>
        </div>
      )}

      <button
        onClick={handleBackToCourse}
        className="mt-8 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 ease-in-out"
      >
        Back to Course
      </button>
    </div>
  );
}
