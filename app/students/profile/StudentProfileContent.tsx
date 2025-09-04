"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import styles from "./student-profile.module.css";

interface StudentInfo {
  firstName: string;
  secondName: string;
  thirdName: string;
  forthName: string;
  email: string;
  studentPhone: string;
  fatherPhone: string;
  motherPhone: string;
  year: string;
  gender: string;
  school: string;
  studentCode: string;
  createdAt: string;
  devices?: string[];
}

interface QuizData {
  earnedMarks: number;
  totalPossibleMarks: number;
}

interface ProgressItem {
  id: string;
  courseTitle: string;
  lectureTitle: string;
  quiz: QuizData;
  isHidden: boolean;
}

export default function StudentProfileContent() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("id");
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [progressData, setProgressData] = useState<ProgressItem[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        // Check if user is admin
        const adminDocRef = doc(db, "superAdmins", user.email);
        const adminDocSnap = await getDoc(adminDocRef);

        if (adminDocSnap.exists()) {
          setIsAdmin(true);
          await fetchStudentData();
        } else {
          router.push("/");
        }
      } else {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [studentId, router]);

  const fetchStudentData = async () => {
    if (!studentId) {
      setError("No student ID provided.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Fetch student basic info
      const studentDocRef = doc(db, "students", studentId);
      const studentDoc = await getDoc(studentDocRef);

      if (!studentDoc.exists()) {
        setError("Student not found.");
        return;
      }

      const studentData = studentDoc.data() as StudentInfo;
      setStudentInfo(studentData);

      // Fetch student progress
      const progressCollectionRef = collection(
        db,
        "students",
        studentId,
        "progress"
      );

      const progressSnapshot = await getDocs(progressCollectionRef);

      if (!progressSnapshot.empty) {
        const items: ProgressItem[] = await Promise.all(
          progressSnapshot.docs.map(async (docSnap) => {
            const quiz = docSnap.data() as QuizData;
            const docId = docSnap.id;

            const [year, courseId, lectureId] = docId.split("_");

            // Fetch course title
            let courseTitle = courseId;
            try {
              const courseDocRef = doc(db, "years", year, "courses", courseId);
              const courseDoc = await getDoc(courseDocRef);
              if (courseDoc.exists()) {
                courseTitle = courseDoc.data().title || courseId;
              }
            } catch (err) {
              console.warn("Failed to fetch course title for", courseId, err);
            }

            // Fetch lecture details
            let lectureTitle = lectureId;
            let isHidden = false;
            try {
              const lectureDocRef = doc(
                db,
                "years",
                year,
                "courses",
                courseId,
                "lectures",
                lectureId
              );
              const lectureDoc = await getDoc(lectureDocRef);
              if (lectureDoc.exists()) {
                const data = lectureDoc.data();
                lectureTitle = data.title || lectureId;
                isHidden = !!data.isHidden;
              }
            } catch (err) {
              console.warn("Failed to fetch lecture title for", lectureId, err);
            }

            return {
              id: docId,
              quiz,
              courseTitle,
              lectureTitle,
              isHidden,
            };
          })
        );

        // Filter out hidden lectures
        const visibleItems = items.filter((item) => !item.isHidden);
        setProgressData(visibleItems);
      }
    } catch (err) {
      console.error("Error fetching student data:", err);
      setError("Failed to load student data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallStats = () => {
    if (progressData.length === 0)
      return { totalQuizzes: 0, totalMarks: 0, earnedMarks: 0, percentage: 0 };

    const totalQuizzes = progressData.length;
    const totalMarks = progressData.reduce(
      (sum, item) => sum + item.quiz.totalPossibleMarks,
      0
    );
    const earnedMarks = progressData.reduce(
      (sum, item) => sum + item.quiz.earnedMarks,
      0
    );
    const percentage =
      totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0;

    return { totalQuizzes, totalMarks, earnedMarks, percentage };
  };

  const stats = calculateOverallStats();

  if (loading) {
    return (
      <div className={styles.center}>
        <p>Loading student profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.center}>
        <p className={styles.error}>{error}</p>
        <button onClick={() => router.push("/students")}>Go Back</button>
      </div>
    );
  }

  if (!studentInfo) {
    return (
      <div className={styles.center}>
        <p>Student not found.</p>
        <button onClick={() => router.push("/students")}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <div className={styles.header}>
        <button onClick={() => router.push("/students")}>
          ← Back to Students
        </button>
        <h1>Student Profile</h1>
      </div>

      {/* Student Information */}
      <div className={styles.section}>
        <h2>Personal Information</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <strong>Full Name:</strong>
            <span>
              {studentInfo.firstName} {studentInfo.secondName}{" "}
              {studentInfo.thirdName} {studentInfo.forthName}
            </span>
          </div>
          <div className={styles.infoItem}>
            <strong>Student Code:</strong>
            <span>{studentInfo.studentCode}</span>
          </div>
          <div className={styles.infoItem}>
            <strong>Email:</strong>
            <span>{studentInfo.email}</span>
          </div>
          <div className={styles.infoItem}>
            <strong>Gender:</strong>
            <span>{studentInfo.gender}</span>
          </div>
          <div className={styles.infoItem}>
            <strong>Year:</strong>
            <span>{studentInfo.year.toUpperCase()}</span>
          </div>
          <div className={styles.infoItem}>
            <strong>School:</strong>
            <span>{studentInfo.school}</span>
          </div>
          <div className={styles.infoItem}>
            <strong>Student Phone:</strong>
            <span>{studentInfo.studentPhone}</span>
          </div>
          <div className={styles.infoItem}>
            <strong>Fathers Phone:</strong>
            <span>{studentInfo.fatherPhone}</span>
          </div>
          <div className={styles.infoItem}>
            <strong>Mothers Phone:</strong>
            <span>{studentInfo.motherPhone}</span>
          </div>
          <div className={styles.infoItem}>
            <strong>Registration Date:</strong>
            <span>{new Date(studentInfo.createdAt).toLocaleDateString()}</span>
          </div>
          {studentInfo.devices && studentInfo.devices.length > 0 && (
            <div className={styles.infoItem}>
              <strong>Devices:</strong>
              <span>{studentInfo.devices.length} device(s)</span>
            </div>
          )}
        </div>
      </div>

      {/* Quiz Results */}
      <div className={styles.section}>
        <h2>Quiz Results</h2>
        {progressData.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Course</th>
                <th>Lecture</th>
                <th>Score</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {progressData.map((item) => {
                const percentage = Math.round(
                  (item.quiz.earnedMarks / item.quiz.totalPossibleMarks) * 100
                );
                return (
                  <tr key={item.id}>
                    <td>{item.courseTitle}</td>
                    <td>{item.lectureTitle}</td>
                    <td>
                      {item.quiz.earnedMarks} / {item.quiz.totalPossibleMarks}
                    </td>
                    <td>
                      <span
                        className={`${styles.percentage} ${
                          percentage >= 70
                            ? styles.good
                            : percentage >= 50
                            ? styles.average
                            : styles.poor
                        }`}
                      >
                        {percentage}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className={styles.empty}>
            This student hasnt completed any quizzes yet.
          </p>
        )}
      </div>
    </div>
  );
}
