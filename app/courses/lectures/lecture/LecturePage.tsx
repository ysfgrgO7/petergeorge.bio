"use client";

import { useSearchParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLectureProgress } from "@/lib/studentProgress";
import styles from "../../courses.module.css";

import { IoChevronBackCircleSharp } from "react-icons/io5";

interface ProgressData {
  quizCompleted?: boolean;
  score?: number;
  total?: number;
}

interface LinkItem extends DocumentData {
  id: string;
  text: string;
  url: string;
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
  const odyseeName = searchParams.get("odyseeName");
  const odyseeId = searchParams.get("odyseeId");
  const lectureTitle = searchParams.get("title");

  const [user, setUser] = useState<User | null>(null);
  const [courseTitle, setCourseTitle] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [homeworkVideos, setHomeworkVideos] = useState<HomeworkVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // This code only runs on the client
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Set initial value on mount
    handleResize();

    // Add and remove event listener for dynamic updates
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty dependency array ensures this runs once on mount

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
          // Fetch the lecture document
          const lectureDocRef = doc(
            db,
            `years/${year}/courses/${courseId}/lectures/${lectureId}`
          );
          const lectureDocSnap = await getDoc(lectureDocRef);

          if (lectureDocSnap.exists()) {
            const lectureData = lectureDocSnap.data();
            const isLectureEnabled = lectureData?.isEnabled ?? true;

            // Just mark expired, don't stop other fetching
            if (!isLectureEnabled) {
              setIsExpired(true);
            }

            // Course title
            const courseDocRef = doc(db, `years/${year}/courses/${courseId}`);
            const courseDocSnap = await getDoc(courseDocRef);
            if (courseDocSnap.exists()) {
              setCourseTitle(courseDocSnap.data().title);
            }

            // Extra links
            const linksRef = collection(
              db,
              `years/${year}/courses/${courseId}/lectures/${lectureId}/links`
            );
            const linksSnapshot = await getDocs(linksRef);
            const fetchedLinks: LinkItem[] = linksSnapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() } as LinkItem)
            );
            setLinks(fetchedLinks);

            // Homework videos
            const homeworkVideosRef = collection(
              db,
              `years/${year}/courses/${courseId}/lectures/${lectureId}/homeworkVideos`
            );
            const homeworkVideosSnapshot = await getDocs(homeworkVideosRef);
            const fetchedHomeworkVideos: HomeworkVideo[] =
              homeworkVideosSnapshot.docs.map(
                (doc) => ({ id: doc.id, ...doc.data() } as HomeworkVideo)
              );
            setHomeworkVideos(fetchedHomeworkVideos);

            // Progress
            const lectureProgress = await getLectureProgress(
              currentUser.uid,
              year,
              courseId,
              lectureId
            );
            setProgress(lectureProgress);
          }
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

  const handleBack = () => {
    router.push(`/courses/lectures?year=${year}&courseId=${courseId}`);
  };

  // Missing params
  if (
    !year ||
    !courseId ||
    !lectureId ||
    !odyseeName ||
    !odyseeId ||
    !lectureTitle
  ) {
    return (
      <div className="wrapper">
        <p>Error: Missing video details. Please return to the lectures page.</p>
        <button onClick={() => router.push("/courses")}>Back to Courses</button>
      </div>
    );
  }

  return (
    <div
      className="wrapper"
      style={{
        width: isMobile ? "100%" : "calc(100% - 200px)",
        position: isMobile ? "unset" : "relative",
      }}
    >
      <button
        onClick={handleBack}
        style={{ display: "flex", alignItems: "center" }}
      >
        <IoChevronBackCircleSharp /> Back to Lectures
      </button>
      {loading ? (
        <p>Loading details...</p>
      ) : (
        <>
          <h1 className={styles.lectureTitle}>{lectureTitle}</h1>

          {/* Main lecture video OR expired message */}
          <div className={styles.videoContainer}>
            {isExpired ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "500px",
                  border: "2px dashed red",
                  borderRadius: "8px",
                  padding: "1rem",
                  textAlign: "center",
                }}
              >
                <h2 style={{ color: "red", marginBottom: "0.5rem" }}>
                  The Lecture has Expired 🔒
                </h2>
                <p>This lecture is currently not available.</p>
              </div>
            ) : (
              <div
                style={{ position: "relative", width: "100%", height: "500px" }}
              >
                <iframe
                  src={`https://odysee.com/$/embed/${odyseeName}:${odyseeId}`}
                  width="100%"
                  height="500"
                  allowFullScreen
                  frameBorder="0"
                  style={{ display: "block" }}
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
            )}
          </div>

          <hr />

          {/* Homework Videos */}
          {homeworkVideos.length > 0 && (
            <>
              <section>
                <h1>Homework Videos</h1>
                {homeworkVideos.map((video) => (
                  <div
                    key={video.id}
                    className={styles.videoContainer}
                    style={{ marginBottom: "20px" }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "500px",
                      }}
                    >
                      <iframe
                        src={`https://odysee.com/$/embed/${video.odyseeName}:${video.odyseeId}`}
                        width="100%"
                        height="350"
                        allowFullScreen
                        frameBorder="0"
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
              </section>
              <hr />
            </>
          )}

          {/* Sidebar info */}
          <div className={styles.quizSummaryFloating}>
            <div>
              <p>
                <strong>Course:</strong> {courseTitle || "N/A"}
              </p>
              <hr />
              {progress?.quizCompleted && (
                <p>
                  <strong>Quiz Mark:</strong> {progress.score} /{" "}
                  {progress.total}
                </p>
              )}

              <hr />
              <p>
                <strong>Extra Links</strong>
              </p>
              <ul className={styles.linkList}>
                {links.length > 0 ? (
                  links.map((link) => (
                    <li
                      key={link.id}
                      style={{
                        color: "var(--blue)",
                        filter: "brightness(1.9)",
                        textDecoration: "underline",
                        listStyle: "none",
                      }}
                    >
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.text}
                      </a>
                    </li>
                  ))
                ) : (
                  <li>No extra links found.</li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
