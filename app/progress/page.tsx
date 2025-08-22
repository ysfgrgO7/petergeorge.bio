"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import styles from "./progress.module.css";

interface QuizData {
  score: number;
  totalQuestions: number;
  unlocked: boolean;
  quizCompleted: boolean;
}

interface ProgressItem {
  id: string;
  courseTitle: string;
  lectureTitle: string;
  quiz: QuizData;
}

export default function ProgressPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [progressData, setProgressData] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
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
          quizSnapshot.docs
            .filter((docSnap) => docSnap.data().quizCompleted)
            .map(async (docSnap) => {
              const quiz = docSnap.data() as QuizData;
              const docId = docSnap.id; // e.g., year1_biology_lecture1

              const [year, courseId, lectureId] = docId.split("_");

              // --- fetch course title ---
              let courseTitle = courseId;
              try {
                const courseDocRef = doc(
                  db,
                  "years",
                  year,
                  "courses",
                  courseId
                );
                const courseDoc = await getDoc(courseDocRef);
                if (courseDoc.exists()) {
                  courseTitle = courseDoc.data().title || courseId;
                }
              } catch (err) {
                console.warn("Failed to fetch course title for", courseId, err);
              }

              // --- fetch lecture title ---
              let lectureTitle = lectureId;
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
                  lectureTitle = lectureDoc.data().title || lectureId;
                }
              } catch (err) {
                console.warn(
                  "Failed to fetch lecture title for",
                  lectureId,
                  err
                );
              }

              return {
                id: docId,
                quiz,
                courseTitle,
                lectureTitle,
              };
            })
        );

        setProgressData(items);
      } catch (err) {
        console.error("Error fetching progress data:", err);
        setError("Failed to load your progress. Please try again.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  if (loading) {
    return (
      <div className={styles.center}>
        <p>Loading your progress...</p>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <h1 className={styles.heading}>My Quiz Progress 📚</h1>

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
                  {item.quiz.score} / {item.quiz.totalQuestions}
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
