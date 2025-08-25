"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "../../../courses.module.css";

// This component displays the quiz results after submission.
export default function QuizResults() {
  const router = useRouter();
  const params = useSearchParams();

  // Get the score and total questions from the URL query parameters.
  const score = params.get("score");
  const total = params.get("total");

  // If no score or total is found, show an error message.
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

  const numericScore = parseInt(score, 10);
  const numericTotal = parseInt(total, 10);
  const requiredScore = Math.floor(numericTotal / 2) + 1;
  const passed = numericScore >= requiredScore;

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
          {numericScore}/{numericTotal}
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
