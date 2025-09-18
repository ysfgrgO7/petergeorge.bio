"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { BiChevronLeft, BiTrophy } from "react-icons/bi";
import {
  IoCheckmarkCircle,
  IoCloseCircle,
  IoDocumentText,
} from "react-icons/io5";
import { TbVersions } from "react-icons/tb";
import { FaEdit, FaCheck, FaTimes } from "react-icons/fa";

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
  answerText: string;
  marks: number;
  maxMarks: number;
  type: "essay";
  feedback?: string;
  questionId?: string;
}

interface QuizData {
  answers: {
    mcq: MCQAnswer[];
    essay: { [key: string]: EssayAnswer };
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
  const [essayQuestionMarks, setEssayQuestionMarks] = useState<{
    [key: string]: number;
  }>({});
  const [editingMarks, setEditingMarks] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [tempMarks, setTempMarks] = useState<{ [key: string]: number }>({});
  const [savingMarks, setSavingMarks] = useState<{ [key: string]: boolean }>(
    {}
  );

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

  const fetchEssayQuestionMarks = async () => {
    try {
      const essayQuestionsRef = collection(
        db,
        "years",
        year!,
        "courses",
        courseId!,
        "lectures",
        lectureId!,
        "essayQuestions"
      );

      const essayQuestionsSnap = await getDocs(essayQuestionsRef);
      const marksMap: { [key: string]: number } = {};

      essayQuestionsSnap.forEach((doc) => {
        const data = doc.data();
        marksMap[doc.id] = data.marks || 0;
      });

      setEssayQuestionMarks(marksMap);
      return marksMap;
    } catch (error) {
      console.error("Error fetching essay question marks:", error);
      return {};
    }
  };

  const fetchQuizData = async () => {
    try {
      setLoading(true);

      // Fetch essay question marks first
      await fetchEssayQuestionMarks();

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

  const startEditingMark = (questionIndex: string, currentMark: number) => {
    setEditingMarks((prev) => ({ ...prev, [questionIndex]: true }));
    setTempMarks((prev) => ({ ...prev, [questionIndex]: currentMark }));
  };

  const cancelEditingMark = (questionIndex: string) => {
    setEditingMarks((prev) => ({ ...prev, [questionIndex]: false }));
    setTempMarks((prev) => {
      const newTemp = { ...prev };
      delete newTemp[questionIndex];
      return newTemp;
    });
  };

  const saveMarkToFirestore = async (
    questionIndex: string,
    newMark: number
  ) => {
    if (!quizData || !studentId || !courseId || !lectureId || !year) return;

    setSavingMarks((prev) => ({ ...prev, [questionIndex]: true }));

    try {
      // Update the local quiz data
      const updatedQuizData = { ...quizData };
      const essayAnswers = { ...updatedQuizData.answers.essay };

      if (essayAnswers[questionIndex]) {
        const oldMark = essayAnswers[questionIndex].marks || 0;
        essayAnswers[questionIndex] = {
          ...essayAnswers[questionIndex],
          marks: newMark,
        };

        // Recalculate total earned marks
        const markDifference = newMark - oldMark;
        updatedQuizData.earnedMarks = Math.max(
          0,
          updatedQuizData.earnedMarks + markDifference
        );
        updatedQuizData.answers.essay = essayAnswers;
      }

      // Update Firestore
      const progressDocId = `${year}_${courseId}_${lectureId}`;
      const progressRef = doc(
        db,
        "students",
        studentId,
        "progress",
        progressDocId
      );

      await updateDoc(progressRef, {
        "answers.essay": essayAnswers,
        earnedMarks: updatedQuizData.earnedMarks,
        lastUpdated: new Date(),
      });

      // Update local state
      setQuizData(updatedQuizData);
      setEditingMarks((prev) => ({ ...prev, [questionIndex]: false }));
      setTempMarks((prev) => {
        const newTemp = { ...prev };
        delete newTemp[questionIndex];
        return newTemp;
      });

      console.log("Mark updated successfully");
    } catch (error) {
      console.error("Error updating mark:", error);
      alert("Failed to update mark. Please try again.");
    } finally {
      setSavingMarks((prev) => ({ ...prev, [questionIndex]: false }));
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

      {/* Essay Questions */}
      {quizData.answers.essay &&
        Object.keys(quizData.answers.essay).length > 0 && (
          <div className={styles.sectionContainer}>
            <h3 className={styles.sectionTitle}>
              <IoDocumentText className={styles.sectionIcon} />
              Essay Questions ({Object.keys(quizData.answers.essay).length})
            </h3>

            <table className={styles.quizTable}>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Student Answer</th>
                  <th>Max Marks</th>
                  <th>Earned Marks</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(quizData.answers.essay).map(
                  ([key, answerObj]) => {
                    const index = Number(key);
                    const answer = answerObj as EssayAnswer;

                    const questionMarks = answer.questionId
                      ? essayQuestionMarks[answer.questionId]
                      : Object.values(essayQuestionMarks)[index] ||
                        answer.maxMarks ||
                        0;

                    const currentMarks = answer.marks || 0;
                    const isEditing = editingMarks[key] || false;
                    const isSaving = savingMarks[key] || false;
                    const tempMark = tempMarks[key] ?? currentMarks;

                    return (
                      <tr key={index}>
                        <td>
                          Q{index + 1}. {answer.question}
                        </td>
                        <td>{answer.answerText || "No answer provided"}</td>
                        <td>{questionMarks}</td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "start",
                              gap: "0.5rem",
                              flexDirection: "column",
                            }}
                          >
                            {isEditing ? (
                              <>
                                <input
                                  type="number"
                                  min="0"
                                  max={questionMarks}
                                  step={0.5}
                                  value={tempMark}
                                  onChange={(e) =>
                                    setTempMarks((prev) => ({
                                      ...prev,
                                      [key]: Math.max(
                                        0,
                                        Math.min(
                                          questionMarks,
                                          Number(e.target.value)
                                        )
                                      ),
                                    }))
                                  }
                                  style={{
                                    width: "60px",
                                    padding: "0.25rem",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "4px",
                                    fontSize: "1rem",
                                  }}
                                  disabled={isSaving}
                                />
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  <button
                                    onClick={() =>
                                      saveMarkToFirestore(key, tempMark)
                                    }
                                    disabled={isSaving}
                                    style={{
                                      background: "var(--green)",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "4px",
                                      padding: "0.25rem 0.5rem",
                                      cursor: isSaving
                                        ? "not-allowed"
                                        : "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                    }}
                                    title="Save mark"
                                  >
                                    <FaCheck size={12} />
                                    {isSaving ? "Saving..." : ""}
                                  </button>
                                  <button
                                    onClick={() => cancelEditingMark(key)}
                                    disabled={isSaving}
                                    style={{
                                      background: "var(--red)",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "4px",
                                      padding: "0.25rem 0.5rem",
                                      cursor: isSaving
                                        ? "not-allowed"
                                        : "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                    title="Cancel"
                                  >
                                    <FaTimes size={12} />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <span
                                  style={{
                                    fontSize: "1.1rem",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {currentMarks}
                                </span>
                                <button
                                  onClick={() =>
                                    startEditingMark(key, currentMarks)
                                  }
                                  title="Edit mark"
                                >
                                  <FaEdit size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}

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
      </div>
    </div>
  );
}
