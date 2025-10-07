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
import { MdEditDocument } from "react-icons/md";

interface ProgressData {
  quizCompleted?: boolean;
  earnedMarks?: number;
  totalPossibleMarks?: number;
  unlocked?: boolean;
  isEnabled?: boolean;
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
  system?: "center" | "online" | "school";
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

  const [homeworkCompleted, setHomeworkCompleted] = useState(false);
  const [hasHomework, setHasHomework] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);

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
          let isLectureEnabled = true;

          // STEP 1: Check lecture-level enable/disable first
          const lectureDocRef = doc(
            db,
            `years/${year}/courses/${courseId}/lectures/${lectureId}`
          );
          const lectureDocSnap = await getDoc(lectureDocRef);

          let lectureLevelEnabled = true;

          if (lectureDocSnap.exists()) {
            const lectureData = lectureDocSnap.data();

            // Check lecture-level based on student system
            if (currentStudentData?.system === "center") {
              lectureLevelEnabled = lectureData.isEnabledCenter !== false;
            } else if (currentStudentData?.system === "online") {
              lectureLevelEnabled = lectureData.isEnabledOnline !== false;
            } else if (currentStudentData?.system === "school") {
              lectureLevelEnabled = lectureData.isEnabledSchool !== false;
            }
          }

          // STEP 2: Apply logic based on lecture-level status
          if (lectureLevelEnabled) {
            // If lecture-level is ENABLED, everyone can see it (ignore student progress isEnabled)
            isLectureEnabled = true;
          } else {
            // If lecture-level is DISABLED, check student progress for exceptions
            const progressDocRef = doc(
              db,
              "students",
              currentUser.uid,
              "progress",
              `${year}_${courseId}_${lectureId}`
            );
            const progressDocSnap = await getDoc(progressDocRef);

            if (progressDocSnap.exists()) {
              const progressData = progressDocSnap.data();

              // Only check student-specific isEnabled if lecture is unlocked
              if (progressData.unlocked === true) {
                // Use student-specific isEnabled, default to false if not set
                isLectureEnabled = progressData.isEnabled === true;
              } else {
                // Not unlocked, so disabled
                isLectureEnabled = false;
              }
            } else {
              // No progress document and lecture-level is disabled, so disabled
              isLectureEnabled = false;
            }
          }

          // If lecture is disabled (either globally or for this specific student), mark as expired
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
          const fetchedExtraVideos: ExtraVideo[] = extraVideosSnapshot.docs.map(
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

          // Fetch homework completion status
          const hwRef = doc(
            db,
            "students",
            currentUser.uid,
            "homeworkProgress",
            `${year}_${courseId}_${lectureId}`
          );
          const hwSnap = await getDoc(hwRef);
          if (hwSnap.exists()) {
            const hwData = hwSnap.data();
            setHomeworkCompleted(hwData.homeworkCompleted === true);
          }

          // Check for homework existence
          const homeworkQuestionsRef = collection(
            db,
            `years/${year}/courses/${courseId}/lectures/${lectureId}/homeworkQuestions`
          );
          const homeworkQuestionsSnapshot = await getDocs(homeworkQuestionsRef);
          setHasHomework(!homeworkQuestionsSnapshot.empty);
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
                  This Lecture is Currently Disabled
                </h2>
                <p>
                  This lecture has been temporarily disabled by your instructor.
                </p>
                {studentData?.system && (
                  <p style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                    Student System:{" "}
                    <strong>{studentData.system.toUpperCase()}</strong>
                  </p>
                )}
                <p style={{ fontSize: "0.9rem", marginTop: "1rem" }}>
                  Please contact your instructor if you believe this is an
                  error.
                </p>
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

          {/* Related Videos -> only show if homework completed */}
          {(!hasHomework || homeworkCompleted) && homeworkVideos.length > 0 && (
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
                    <strong>Quiz Mark:</strong> {progress.earnedMarks} /{" "}
                    {progress.totalPossibleMarks}
                  </p>
                  <hr />
                </>
              )}

              <p>
                <strong>Extra Links</strong>
              </p>
              {hasHomework &&
                !homeworkCompleted &&
                " (Complete Homework to Unlock)"}

              {(!hasHomework || homeworkCompleted) &&
                homeworkVideos.length > 0 && (
                  <ul className={styles.linkList}>
                    {links.length > 0 ? (
                      links.map((link) => (
                        <li
                          key={link.id}
                          style={{
                            color: "var(--blue)",
                            filter: "brightness(1.9)",
                            textDecoration: "underline",
                          }}
                        >
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {link.text}
                          </a>

                          <hr style={{ width: "40%", margin: "0.4rem" }} />
                        </li>
                      ))
                    ) : (
                      <li>No extra links found.</li>
                    )}
                  </ul>
                )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {progress?.quizCompleted && (
                <button
                  onClick={() =>
                    router.push(
                      `/courses/lectures/quiz/results?year=${year}&courseId=${courseId}&lectureId=${lectureId}`
                    )
                  }
                >
                  <MdEditDocument /> Quiz Result
                </button>
              )}
              {/* Homework button - Updated rendering logic */}
              {hasHomework && !homeworkCompleted && (
                <button
                  onClick={() =>
                    router.push(
                      `/courses/lectures/lecture/hw?year=${year}&courseId=${courseId}&lectureId=${lectureId}`
                    )
                  }
                >
                  <MdEditDocument /> Start Homework
                </button>
              )}

              {hasHomework && homeworkCompleted && (
                <button
                  onClick={() =>
                    router.push(
                      `/courses/lectures/lecture/hw/results?year=${year}&courseId=${courseId}&lectureId=${lectureId}`
                    )
                  }
                >
                  <MdEditDocument /> Homework Result
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
