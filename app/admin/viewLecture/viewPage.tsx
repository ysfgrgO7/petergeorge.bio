"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, DocumentData } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase"; // Make sure to import 'db'
import styles from "../admin.module.css";

// Interfaces
interface ExistingQuiz extends DocumentData {
  id: string;
  question: string;
  options?: string[];
  correctAnswerIndex?: number;
  imageUrl?: string;
}

interface HomeworkVideo {
  id: string;
  odyseeName: string;
  odyseeId: string;
}

export default function LecturePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const year = searchParams.get("year");
  const courseId = searchParams.get("courseId");
  const lectureId = searchParams.get("lectureId");
  const lectureTitle = searchParams.get("lectureTitle");
  const odyseeName = searchParams.get("odyseeName");
  const odyseeId = searchParams.get("odyseeId"); // --- Quiz state ---

  const [homeworkVideos, setHomeworkVideos] = useState<HomeworkVideo[]>([]);

  const [existingQuizzes, setExistingQuizzes] = useState<ExistingQuiz[]>([]);
  const [existingEssays, setExistingEssays] = useState<ExistingQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lectureId || !courseId || !year) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch MCQs
        const mcqRef = collection(
          db,
          `years/${year}/courses/${courseId}/lectures/${lectureId}/quizzes`
        );
        const mcqSnapshot = await getDocs(mcqRef);
        const mcqData = mcqSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ExistingQuiz[];
        setExistingQuizzes(mcqData);

        // Fetch Essays
        const essayRef = collection(
          db,
          `years/${year}/courses/${courseId}/lectures/${lectureId}/essayQuestions`
        );
        const essaySnapshot = await getDocs(essayRef);
        const essayData = essaySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ExistingQuiz[];
        setExistingEssays(essayData);

        // ✅ Fetch Homework Videos
        const homeworkRef = collection(
          db,
          `years/${year}/courses/${courseId}/lectures/${lectureId}/homeworkVideos`
        );
        const homeworkSnapshot = await getDocs(homeworkRef);
        const homeworkData = homeworkSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as HomeworkVideo[];
        setHomeworkVideos(homeworkData);
      } catch (error) {
        console.error("Error fetching lecture data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [lectureId, courseId, year]);

  if (!lectureId) {
    return <div>Lecture not found.</div>;
  }

  return (
    <div className="wrapper">
      <h1>{lectureTitle}</h1>
      <button onClick={() => router.back()}>Back to Admin Dashboard</button>

      {odyseeName && odyseeId && (
        <div className={styles.videoPlayer}>
          <div style={{ position: "relative", width: "100%", height: "500px" }}>
            <iframe
              id="odysee-iframe"
              width="100%"
              height="500"
              src={`https://odysee.com/$/embed/${odyseeName}:${odyseeId}`}
              allowFullScreen
            ></iframe>
            <button
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100px",
                background: "transparent",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
              }}
            ></button>
          </div>
        </div>
      )}
      <hr />

      <h1>Homework Videos</h1>
      {homeworkVideos.map((video) => (
        <div
          key={video.id}
          className={styles.videoContainer}
          style={{ marginBottom: "20px" }}
        >
          <div style={{ position: "relative", width: "100%", height: "500px" }}>
            <iframe
              src={`https://odysee.com/$/embed/${video.odyseeName}:${video.odyseeId}`}
              width="100%"
              height="350"
              allowFullScreen
            />
            <button
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100px",
                background: "transparent",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
              }}
            ></button>
          </div>
        </div>
      ))}

      {loading ? (
        <p>Loading quiz questions...</p>
      ) : (
        <>
          <h2>Existing MCQs</h2>
          {existingQuizzes.length > 0 ? (
            <ul>
              {existingQuizzes.map((q, i) => (
                <li key={q.id}>
                  <p>
                    <strong>
                      {i + 1}. {q.question}
                    </strong>
                  </p>
                  {q.options && q.options.length > 0 && (
                    <ul className={styles.optionsList}>
                      {q.options.map((option, j) => (
                        <li
                          key={j}
                          className={
                            j === q.correctAnswerIndex
                              ? styles.correctOption
                              : ""
                          }
                        >
                          {option}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No MCQs yet.</p>
          )}
          {/* Display Existing Essays */}
          <h2>Existing Essays</h2>
          {existingEssays.length > 0 ? (
            <ul>
              {existingEssays.map((q, i) => (
                <li key={q.id}>
                  {i + 1}. {q.question}
                </li>
              ))}
            </ul>
          ) : (
            <p>No essays yet.</p>
          )}
        </>
      )}
    </div>
  );
}
