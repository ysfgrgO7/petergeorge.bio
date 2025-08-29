"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  DocumentData,
  doc,
  getDoc,
} from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { getAllQuizVariants } from "@/lib/quizUtils";
import styles from "../admin.module.css";
import { onAuthStateChanged } from "firebase/auth";

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

interface QuizVariantData {
  [variantName: string]: ExistingQuiz[];
}

export default function LecturePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);

  const year = searchParams.get("year");
  const courseId = searchParams.get("courseId");
  const lectureId = searchParams.get("lectureId");
  const lectureTitle = searchParams.get("lectureTitle");
  const odyseeName = searchParams.get("odyseeName");
  const odyseeId = searchParams.get("odyseeId");

  const [homeworkVideos, setHomeworkVideos] = useState<HomeworkVideo[]>([]);
  const [quizVariants, setQuizVariants] = useState<QuizVariantData>({});
  const [existingEssays, setExistingEssays] = useState<ExistingQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "variant1Quizzes" | "variant2Quizzes" | "variant3Quizzes"
  >("variant1Quizzes");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.email) {
          const adminDocRef = doc(db, "admins", user.email);
          const adminDocSnap = await getDoc(adminDocRef);

          if (adminDocSnap.exists()) {
            setIsAdmin(true);
          } else {
            router.push("/");
          }
        } else {
          router.push("/");
        }
      } else {
        router.push("/");
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup the listener on component unmount
  }, [router]);

  useEffect(() => {
    if (!lectureId || !courseId || !year) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all quiz variants
        const variants = getAllQuizVariants();
        const variantData: QuizVariantData = {};

        for (const variant of variants) {
          const variantRef = collection(
            db,
            `years/${year}/courses/${courseId}/lectures/${lectureId}/${variant}`
          );
          const variantSnapshot = await getDocs(variantRef);
          const variantQuizzes = variantSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as ExistingQuiz[];
          variantData[variant] = variantQuizzes;
        }

        setQuizVariants(variantData);

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

        // Fetch Homework Videos
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

  const getVariantDisplayName = (variantName: string) => {
    const variantNumber = variantName
      .replace("variant", "")
      .replace("Quizzes", "");
    return `Variant ${variantNumber}`;
  };

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
          <h2>Quiz Variants</h2>

          {/* Tab Navigation */}
          <div className={styles.tabs}>
            <div className={styles.yearTabs}>
              <button
                className={
                  activeTab === "variant1Quizzes" ? styles.activeTab : ""
                }
                onClick={() => setActiveTab("variant1Quizzes")}
              >
                Variant 1
              </button>
              <button
                className={
                  activeTab === "variant2Quizzes" ? styles.activeTab : ""
                }
                onClick={() => setActiveTab("variant2Quizzes")}
              >
                Variant 2
              </button>
              <button
                className={
                  activeTab === "variant3Quizzes" ? styles.activeTab : ""
                }
                onClick={() => setActiveTab("variant3Quizzes")}
              >
                Variant 3
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent}>
            {Object.keys(quizVariants).length > 0 ? (
              <div>
                <h3>{getVariantDisplayName(activeTab)}</h3>
                {quizVariants[activeTab] &&
                quizVariants[activeTab].length > 0 ? (
                  <ul className={styles.quizList}>
                    <br />
                    {quizVariants[activeTab].map((q, i) => (
                      <li key={q.id} className={styles.quizItem}>
                        <p className={styles.questionText}>
                          <strong>
                            {i + 1}. {q.question}
                          </strong>
                        </p>
                        {q.imageUrl && (
                          <div className={styles.questionImage}>
                            <img
                              src={q.imageUrl}
                              alt={`Question ${i + 1}`}
                              style={{ maxWidth: "300px", height: "auto" }}
                            />
                          </div>
                        )}
                        {q.options && q.options.length > 0 && (
                          <ul className={styles.optionsList}>
                            {q.options.map((option, j) => (
                              <li
                                key={j}
                                className={`${styles.optionItem} ${
                                  j === q.correctAnswerIndex
                                    ? styles.correctOption
                                    : ""
                                }`}
                              >
                                {option}
                                {j === q.correctAnswerIndex && (
                                  <span className={styles.checkmark}>✅ </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}

                        <br />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No MCQs in this variant yet.</p>
                )}
              </div>
            ) : (
              <p>No quiz variants found.</p>
            )}
          </div>

          {/* Display Existing Essays */}
          <hr />
          <h2>Essay Questions</h2>
          {existingEssays.length > 0 ? (
            <ul className={styles.essayList}>
              {existingEssays.map((q, i) => (
                <li key={q.id} className={styles.essayItem}>
                  <p>
                    <strong>
                      {i + 1}. {q.question}
                    </strong>
                  </p>
                  {q.imageUrl && (
                    <div className={styles.questionImage}>
                      <img
                        src={q.imageUrl}
                        alt={`Essay Question ${i + 1}`}
                        style={{ maxWidth: "300px", height: "auto" }}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No essay questions yet.</p>
          )}
        </>
      )}
    </div>
  );
}
