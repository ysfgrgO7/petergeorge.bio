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

interface ExtraVideo {
  id: string;
  odyseeName: string;
  odyseeId: string;
}

interface StudentData {
  studentCode?: string;
  firstName?: string;
  secondName?: string;
  system?: "center" | "online"; // NEW: Add system field
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
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [courseTitle, setCourseTitle] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [homeworkVideos, setHomeworkVideos] = useState<HomeworkVideo[]>([]);
  const [extraVideos, setExtraVideos] = useState<ExtraVideo[]>([]);
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

      // Fetch student data to get student code and system
      let currentStudentData: StudentData | null = null;
      try {
        const studentDocRef = doc(db, "students", currentUser.uid);
        const studentDocSnap = await getDoc(studentDocRef);
        if (studentDocSnap.exists()) {
          currentStudentData = studentDocSnap.data() as StudentData;
          setStudentData(currentStudentData);
        }
      } catch (error) {
        console.error("Error fetching student data:", error);
      }

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

            // NEW: Check system-specific enabled status
            let isLectureEnabled = true;

            if (currentStudentData?.system) {
              // Check the specific system field
              if (currentStudentData.system === "center") {
                isLectureEnabled = lectureData?.isEnabledCenter !== false; // Default to true if undefined
              } else if (currentStudentData.system === "online") {
                isLectureEnabled = lectureData?.isEnabledOnline !== false; // Default to true if undefined
              }
            } else {
              // Fallback to general isEnabled if no system is specified
              isLectureEnabled = lectureData?.isEnabled ?? true;
            }

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

            // Extra videos
            const extraVideosRef = collection(
              db,
              `years/${year}/courses/${courseId}/lectures/${lectureId}/extraVideos`
            );
            const extraVideosSnapshot = await getDocs(extraVideosRef);
            const fetchedExtraVideos: ExtraVideo[] =
              extraVideosSnapshot.docs.map(
                (doc) => ({ id: doc.id, ...doc.data() } as ExtraVideo)
              );
            setExtraVideos(fetchedExtraVideos);

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

  // Video overlay component
  const VideoOverlay = ({ children }: { children: React.ReactNode }) => (
    <div style={{ position: "relative", width: "100%" }}>
      {children}
      {/* Student Code Overlay */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          background: "rgba(0, 0, 0, 0.8)",
          color: "white",
          padding: "8px 12px",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: "bold",
          zIndex: 10,
          pointerEvents: "none",
          fontFamily: "monospace",
          border: "2px solid rgba(255, 255, 255, 0.3)",
          backdropFilter: "blur(4px)",
        }}
      >
        {studentData?.studentCode ? (
          <>
            ID: {studentData.studentCode}
            <br />
            <span style={{ fontSize: "12px", opacity: 0.9 }}>
              {studentData.firstName} {studentData.secondName}
            </span>
            {/* NEW: Show system type */}
            {studentData.system && (
              <>
                <br />
                <span style={{ fontSize: "10px", opacity: 0.7 }}>
                  {studentData.system.toUpperCase()}
                </span>
              </>
            )}
          </>
        ) : (
          "Loading..."
        )}
      </div>
    </div>
  );

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
                <p>
                  This lecture is currently not available for your student
                  system.
                </p>
                {/* NEW: Show which system the student belongs to */}
                {studentData?.system && (
                  <p style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                    Student System:{" "}
                    <strong>{studentData.system.toUpperCase()}</strong>
                  </p>
                )}
              </div>
            ) : (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "max-content",
                }}
              >
                <section>
                  <VideoOverlay>
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
                  </VideoOverlay>
                </section>

                <section>
                  {/* Additional Videos */}
                  {extraVideos.length > 0 && (
                    <>
                      <section>
                        <br />
                        {extraVideos.map((video) => (
                          <div
                            key={video.id}
                            className={styles.videoContainer}
                            style={{
                              position: "relative",
                              width: "100%",
                            }}
                          >
                            <VideoOverlay>
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
                            </VideoOverlay>
                          </div>
                        ))}
                      </section>
                    </>
                  )}
                </section>
              </div>
            )}
          </div>

          <hr />

          {/* Homework Videos */}
          {homeworkVideos.length > 0 && (
            <>
              <section>
                <h1>Related Videos</h1>
                {homeworkVideos.map((video) => (
                  <div
                    key={video.id}
                    className={styles.videoContainer}
                    style={{
                      position: "relative",
                      width: "100%",
                    }}
                  >
                    <VideoOverlay>
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
                    </VideoOverlay>
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
                <>
                  <p>
                    <strong>Quiz Mark:</strong> {progress.score} /{" "}
                    {progress.total}
                  </p>
                  <hr />
                </>
              )}

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
