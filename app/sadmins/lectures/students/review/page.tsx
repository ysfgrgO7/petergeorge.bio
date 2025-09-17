"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { BiChevronLeft, BiTrophy } from "react-icons/bi";
import {
  IoCheckmarkCircle,
  IoCloseCircle,
  IoDocumentText,
} from "react-icons/io5";

import sadminStyles from "../../sadmins.module.css";
import pageStyles from "./page.module.css";

// Merge styles if needed
const styles = { ...sadminStyles, ...pageStyles };

interface MCQAnswer {
  question: string;
  selectedIndex: number;
  selectedText: string;
  correctAnswer: string;
  isCorrect: boolean;
  marks: number;
  type: "mcq";
}

interface EssayAnswer {
  question: string;
  answer: string;
  marks: number;
  maxMarks: number;
  type: "essay";
  feedback?: string;
}

interface QuizData {
  answers: {
    mcq: MCQAnswer[];
    essay: EssayAnswer[];
  };
  earnedMarks: number;
  totalPossibleMarks: number;
  attempts: number;
  lastVariantUsed: string;
  quizCompleted: boolean;
}

interface StudentInfo {
  name: string;
  email: string;
  year: string;
}

export default function QuizReviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [lectureTitle, setLectureTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const studentId = searchParams.get("studentId");
  const courseId = searchParams.get("courseId");
  const lectureId = searchParams.get("lectureId");
  const year = searchParams.get("year");
  const studentName = searchParams.get("studentName");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        const adminDocRef = doc(db, "superAdmins", user.email);
        const adminDocSnap = await getDoc(adminDocRef);
        if (adminDocSnap.exists()) {
          setIsAdmin(true);
        } else {
          router.push("/");
        }
      } else {
        router.push("/");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (studentId && courseId && lectureId && year && isAdmin) {
      fetchQuizData();
    }
  }, [studentId, courseId, lectureId, year, isAdmin]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);

      // Fetch quiz data from student progress
      const progressDocId = `${year}_${courseId}_${lectureId}`;
      const progressRef = doc(
        db,
        "students",
        studentId!,
        "progress",
        progressDocId
      );
      const progressSnap = await getDoc(progressRef);

      if (!progressSnap.exists()) {
        setError("Quiz data not found");
        return;
      }

      const progressData = progressSnap.data();
      setQuizData({
        answers: progressData.answers || { mcq: [], essay: [] },
        earnedMarks: progressData.earnedMarks || 0,
        totalPossibleMarks: progressData.totalPossibleMarks || 0,
        attempts: progressData.attempts || 0,
        lastVariantUsed: progressData.lastVariantUsed || "",
        quizCompleted: progressData.quizCompleted || false,
      });

      // Fetch student info
      const studentRef = doc(db, "students", studentId!);
      const studentSnap = await getDoc(studentRef);

      if (studentSnap.exists()) {
        const studentData = studentSnap.data();
        setStudentInfo({
          name:
            studentData.firstName && studentData.secondName
              ? `${studentData.firstName} ${studentData.secondName}`
              : studentData.displayName || "Unknown Student",
          email: studentData.email || "",
          year: studentData.year || "",
        });
      }

      // Fetch lecture title
      const lectureRef = doc(
        db,
        "years",
        year!,
        "courses",
        courseId!,
        "lectures",
        lectureId!
      );
      const lectureSnap = await getDoc(lectureRef);

      if (lectureSnap.exists()) {
        setLectureTitle(lectureSnap.data().title || "Untitled Lecture");
      }
    } catch (err) {
      console.error("Error fetching quiz data:", err);
      setError("Error loading quiz data");
    } finally {
      setLoading(false);
    }
  };

  const getPercentage = (earned: number, total: number) => {
    if (!total) return 0;
    return Math.round((earned / total) * 100);
  };

  if (loading) {
    return (
      <div className="wrapper">
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading quiz review...</p>
        </div>
      </div>
    );
  }

  if (error || !quizData) {
    return (
      <div className="wrapper">
        <div className={styles.errorContainer}>
          <h2>Error Loading Quiz Review</h2>
          <p>{error}</p>
          <button onClick={() => router.back()}>Go Back</button>
        </div>
      </div>
    );
  }

  const percentage = getPercentage(
    quizData.earnedMarks,
    quizData.totalPossibleMarks
  );

  return (
    <div className="wrapper">
      {/* Navigation */}
      <button style={{ marginBottom: "1rem" }} onClick={() => router.back()}>
        <BiChevronLeft />
        Back to Students
      </button>

      {/* Header */}
      <div className={styles.header}>
        <div style={{ flex: 1 }}>
          <h1>Quiz Review</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
            {lectureTitle}
          </p>
        </div>
      </div>

      {/* Student Info Card */}
      <div className={styles.studentInfoCard} style={{ marginBottom: "2rem" }}>
        <div className={styles.studentHeader}>
          <div
            className={styles.studentAvatar}
            style={{ width: "60px", height: "60px", fontSize: "24px" }}
          >
            {(studentName || studentInfo?.name)?.charAt(0).toUpperCase() || "S"}
          </div>
          <div>
            <h2>
              {decodeURIComponent(studentName || "") ||
                studentInfo?.name ||
                "Unknown Student"}
            </h2>
            <p style={{ color: "var(--text-secondary)" }}>
              {studentInfo?.email}
            </p>
          </div>
        </div>

        <div className={styles.quizMetaGrid}>
          <div className={styles.metaItem}>
            <BiTrophy className={styles.metaIcon} />
            <div>
              <div className={styles.metaLabel}>Score</div>
              <div className={styles.metaValue}>
                {quizData.earnedMarks}/{quizData.totalPossibleMarks} (
                {percentage}%)
              </div>
            </div>
          </div>

          <div className={styles.metaItem}>
            <BiTrophy className={styles.metaIcon} />
            <div>
              <div className={styles.metaLabel}>Attempts</div>
              <div className={styles.metaValue}>{quizData.attempts}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Answers */}
      <div className={styles.quizAnswersContainer}>
        {/* MCQ Questions */}
        {quizData.answers.mcq && quizData.answers.mcq.length > 0 && (
          <div className={styles.sectionContainer}>
            <h3 className={styles.sectionTitle}>
              <IoDocumentText className={styles.sectionIcon} />
              Multiple Choice Questions ({quizData.answers.mcq.length})
            </h3>

            {quizData.answers.mcq.map((answer, index) => (
              <div key={index} className={styles.questionCard}>
                <div className={styles.questionHeader}>
                  <span className={styles.questionNumber}>Q{index + 1}</span>
                  <div className={styles.questionStatus}>
                    {answer.isCorrect ? (
                      <div className={styles.correctBadge}>
                        <IoCheckmarkCircle />
                        Correct ({answer.marks}{" "}
                        {answer.marks === 1 ? "mark" : "marks"})
                      </div>
                    ) : (
                      <div className={styles.incorrectBadge}>
                        <IoCloseCircle />
                        Incorrect (0 marks)
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.questionText}>{answer.question}</div>

                <div className={styles.answerSection}>
                  <div className={styles.studentAnswer}>
                    <strong>Students Answer:</strong>
                    <span
                      className={
                        answer.isCorrect
                          ? styles.correctText
                          : styles.incorrectText
                      }
                    >
                      {answer.selectedText}
                    </span>
                  </div>

                  {!answer.isCorrect && (
                    <div className={styles.correctAnswer}>
                      <strong>Correct Answer:</strong>
                      <span className={styles.correctText}>
                        {answer.correctAnswer}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Essay Questions */}
        {quizData.answers.essay && quizData.answers.essay.length > 0 && (
          <div className={styles.sectionContainer}>
            <h3 className={styles.sectionTitle}>
              <IoDocumentText className={styles.sectionIcon} />
              Essay Questions ({quizData.answers.essay.length})
            </h3>

            {quizData.answers.essay.map((answer, index) => (
              <div key={index} className={styles.questionCard}>
                <div className={styles.questionHeader}>
                  <span className={styles.questionNumber}>
                    Essay {index + 1}
                  </span>
                  <div className={styles.questionStatus}>
                    <div className={styles.essayBadge}>
                      {answer.marks}/{answer.maxMarks} marks
                    </div>
                  </div>
                </div>

                <div className={styles.questionText}>{answer.question}</div>

                <div className={styles.essayAnswer}>
                  <strong>Students Answer:</strong>
                  <div className={styles.essayText}>
                    {answer.answer || "No answer provided"}
                  </div>

                  {answer.feedback && (
                    <div className={styles.feedback}>
                      <strong>Feedback:</strong>
                      <p>{answer.feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className={styles.summaryCard}>
          <h3>Quiz Summary</h3>
          <div className={styles.summaryStats}>
            <div className={styles.summaryItem}>
              <span>Total Questions:</span>
              <span>
                {(quizData.answers.mcq?.length || 0) +
                  (quizData.answers.essay?.length || 0)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span>Score:</span>
              <span
                className={
                  percentage >= 70
                    ? styles.goodScore
                    : percentage >= 50
                    ? styles.averageScore
                    : styles.poorScore
                }
              >
                {quizData.earnedMarks}/{quizData.totalPossibleMarks} (
                {percentage}%)
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span>Quiz Variant:</span>
              <span>{quizData.lastVariantUsed}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
