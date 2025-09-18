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
import { TbVersions } from "react-icons/tb";

import styles from "./page.module.css";
import { FaRedoAlt } from "react-icons/fa";

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

  const meta = [
    {
      label: "Score",
      value: `${quizData.earnedMarks}/${quizData.totalPossibleMarks} (${percentage}%)`,
      icon: BiTrophy,
    },
    { label: "Attempts", value: quizData.attempts, icon: FaRedoAlt },
    { label: "Variant", value: quizData.lastVariantUsed, icon: TbVersions },
  ];

  return (
    <div className="wrapper">
      {/* Navigation */}
      <button style={{ marginBottom: "1rem" }} onClick={() => router.back()}>
        <BiChevronLeft />
        Back to Students
      </button>

      {/* Header */}
      <div className={styles.header}>
        <h1>Quiz Review:</h1>
        <h2>{lectureTitle}</h2>
      </div>

      {/* Student Info Card */}
      <div className={styles.sectionContainer}>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "0.5rem",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <div className={styles.studentAvatar}>
            {studentName?.charAt(0).toUpperCase() || "S"}
          </div>
          <div>
            <h2>{studentName}</h2>
            {studentInfo?.email}
          </div>
        </div>

        <div className={styles.quizMetaGrid}>
          {meta.map((item, index) => (
            <div className={styles.metaItem} key={index}>
              <item.icon style={{ fontSize: "1.5rem" }} />
              <div>
                <h2>{item.value}</h2>
                <div style={{ fontSize: "0.875rem" }}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quiz Answers */}
      <div>
        {quizData.answers.mcq?.length > 0 && (
          <div className={styles.sectionContainer}>
            <h3>
              <IoDocumentText className={styles.sectionIcon} />
              Multiple Choice Questions ({quizData.answers.mcq.length})
            </h3>

            <table className={styles.quizTable}>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Student Answer</th>
                  <th>Correct Answer</th>
                  <th>Marks</th>
                </tr>
              </thead>
              <tbody>
                {quizData.answers.mcq.map((answer, index) => (
                  <tr key={index}>
                    <td>
                      Q{index + 1}. {answer.question}
                    </td>
                    <td
                      className={
                        answer.isCorrect
                          ? styles.correctText
                          : styles.incorrectText
                      }
                    >
                      {answer.selectedText}
                    </td>
                    <td> {answer.correctAnswer} </td>
                    <td>
                      {answer.isCorrect ? (
                        <span style={{ color: "var(--green)" }}>
                          <IoCheckmarkCircle /> {answer.marks}
                        </span>
                      ) : (
                        <span style={{ color: "var(--red)" }}>
                          <IoCloseCircle /> 0
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Essay Questions */}
        {quizData.answers.essay?.length > 0 && (
          <div className={styles.sectionContainer}>
            <h3 className={styles.sectionTitle}>
              <IoDocumentText className={styles.sectionIcon} />
              Essay Questions ({quizData.answers.essay.length})
            </h3>

            <table className={styles.quizTable}>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Student Answer</th>
                </tr>
              </thead>
              <tbody>
                {quizData.answers.essay.map((answer, index) => (
                  <tr key={index}>
                    <td>{answer.question}</td>
                    <td>{answer.answer || "No answer provided"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
