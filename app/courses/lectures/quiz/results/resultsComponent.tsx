"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import styles from "../../../courses.module.css";

export default function QuizResults() {
  const router = useRouter();
  const params = useSearchParams();
  const year = params.get("year");
  const courseId = params.get("courseId");
  const lectureId = params.get("lectureId");

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);

      if (!year || !courseId || !lectureId) {
        setLoading(false);
        return;
      }

      try {
        const resultRef = doc(
          db,
          "students",
          currentUser.uid,
          "progress",
          `${year}_${courseId}_${lectureId}`
        );
        const resultSnap = await getDoc(resultRef);
        if (resultSnap.exists()) {
          const data = resultSnap.data();
          setScore(data.score ?? null);
          setTotal(data.total ?? null);
        }
      } catch (err) {
        console.error("Error fetching results:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [year, courseId, lectureId, router]);

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <p>Loading results...</p>
      </div>
    );
  }

  if (!score || !total) {
    return (
      <div className={styles.wrapper}>
        <h1>Quiz Results</h1>
        <p>No results found. Please complete the quiz first.</p>
        <button
          onClick={() => router.push("/courses")}
          className="mt-8 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 ease-in-out"
        >
          Back to Courses
        </button>
      </div>
    );
  }

  const requiredScore = Math.floor(total / 2) + 1;
  const passed = score >= requiredScore;

  return (
    <div className={styles.wrapper}>
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
          {score}/{total}
        </strong>{" "}
        questions correctly on the multiple-choice section!
      </p>
      <p style={{ marginBottom: "10px" }}>
        Your essay questions will be graded separately. Check Your Progress page
        for updates.
      </p>
      <button
        onClick={() => router.push("/courses")}
        className="mt-8 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 ease-in-out"
      >
        Back to Courses
      </button>
    </div>
  );
}
