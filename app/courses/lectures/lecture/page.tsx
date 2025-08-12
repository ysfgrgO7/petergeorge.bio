"use client";

import { useSearchParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLectureProgress } from "@/lib/studentProgress";
import styles from "../../courses.module.css";

interface Course {
  title: string;
}

interface ProgressData {
  quizCompleted?: boolean;
  score?: number;
  totalQuestions?: number;
}

export default function LecturePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const year = searchParams.get("year");
  const courseId = searchParams.get("courseId");
  const lectureId = searchParams.get("lectureId");
  const odyseeName = searchParams.get("odyseeName");
  const odyseeId = searchParams.get("odyseeId");
  const lectureTitle = searchParams.get("title");

  const [user, setUser] = useState<User | null>(null);
  const [courseTitle, setCourseTitle] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  // Get user and fetch course/progress data
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);

      if (year && courseId && lectureId) {
        try {
          // Fetch course details
          const courseDocRef = doc(db, `years/${year}/courses/${courseId}`);
          const courseDocSnap = await getDoc(courseDocRef);
          if (courseDocSnap.exists()) {
            setCourseTitle(courseDocSnap.data().title);
          }

          // Fetch quiz progress
          const lectureProgress = await getLectureProgress(
            currentUser.uid,
            year,
            courseId,
            lectureId
          );
          setProgress(lectureProgress);
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, year, courseId, lectureId]);

  if (
    !year ||
    !courseId ||
    !lectureId ||
    !odyseeName ||
    !odyseeId ||
    !lectureTitle
  ) {
    return (
      <div className={styles.wrapper}>
        <p>Error: Missing video details. Please return to the lectures page.</p>
        <button onClick={() => router.push("/courses")}>Back to Courses</button>
      </div>
    );
  }

  const handleBack = () => {
    router.push(`/courses/lectures?year=${year}&courseId=${courseId}`);
  };

  return (
    <div className={styles.wrapper}>
      <button onClick={handleBack}>← Back to Lectures</button>
      {loading ? (
        <p>Loading details...</p>
      ) : (
        <>
          <h1 className={styles.lectureTitle}>{lectureTitle}</h1>
          <div className={styles.metaInfo}>
            <p>
              <strong>Course:</strong> {courseTitle || "N/A"}
            </p>
            <p>
              <strong>Student ID:</strong> {user?.uid || "N/A"}
            </p>
            {progress?.quizCompleted && (
              <p>
                <strong>Quiz Mark:</strong> {progress.score} /{" "}
                {progress.totalQuestions}
              </p>
            )}
          </div>
          <div className={styles.videoContainer}>
            <iframe
              src={`https://odysee.com/$/embed/${odyseeName}/${odyseeId}`}
              width="100%"
              height="500"
              allowFullScreen
              frameBorder="0"
            />
          </div>
        </>
      )}
    </div>
  );
}
