"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import styles from "./progress.module.css";

interface QuizData {
  earnedMarks: number;
  totalPossibleMarks: number;
}

interface UserProfile {
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
  uid: string;
}

interface ProgressItem {
  id: string;
  courseTitle: string;
  lectureTitle: string;
  quiz: QuizData | null;
  isHidden: boolean;
}

export default function ProgressPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [progressData, setProgressData] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string>("");
  const auth = getAuth();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(true);
      setError("");

      if (!user || !user.uid) {
        router.push("/");
        return;
      }

      const studentId = String(user.uid).trim();

      try {
        // Fetch user info first
        const userDocRef = doc(db, "students", studentId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as UserProfile;
          setStudentInfo({ ...userData, uid: user.uid });
        }

        // Then fetch progress data
        const progressCollectionRef = collection(
          db,
          "students",
          studentId,
          "progress"
        );

        const quizSnapshot = await getDocs(progressCollectionRef);

        if (quizSnapshot.empty) {
          setProgressData([]);
          setLoading(false);
          return;
        }

        const items: ProgressItem[] = await Promise.all(
          quizSnapshot.docs.map(async (docSnap) => {
            const quiz = docSnap.data() as QuizData;
            const docId = docSnap.id;
            const [year, courseId, lectureId] = docId.split("_");

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
              console.warn(
                "Failed to fetch lecture title or properties for",
                lectureId,
                err
              );
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

        const visibleItems = items.filter((item) => !item.isHidden);
        setProgressData(visibleItems);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load your data. Please try again.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  if (loading) {
    return (
      <div className={styles.center}>
        <p>Loading your data...</p>
      </div>
    );
  }

  return (
    <div className="wrapper">
      {studentInfo && (
        <div className={styles.section}>
          <h1>Personal Information</h1>
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
              <span>
                {new Date(studentInfo.createdAt).toLocaleDateString()}
              </span>
            </div>
            {studentInfo.devices && studentInfo.devices.length > 0 && (
              <div className={styles.infoItem}>
                <strong>Devices:</strong>
                <span>{studentInfo.devices.length} device(s)</span>
              </div>
            )}
          </div>
        </div>
      )}

      <h1 className={styles.heading}>My Quiz Progress</h1>

      {error ? (
        <p className={styles.error}>{error}</p>
      ) : progressData.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Course</th>
              <th>Lecture</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {progressData.map((item) => (
              <tr key={item.id} className={styles.row}>
                <td>{item.courseTitle}</td>
                <td>{item.lectureTitle}</td>
                <td className={styles.score}>
                  {item.quiz && item.quiz.earnedMarks !== undefined
                    ? `${item.quiz.earnedMarks} / ${item.quiz.totalPossibleMarks}`
                    : "No Quiz"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={styles.empty}>
          You haven’t completed any quizzes yet. Keep learning! ✨
        </p>
      )}
    </div>
  );
}
