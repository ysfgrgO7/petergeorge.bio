"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import {
  collection,
  getDocs,
  DocumentData,
  query,
  orderBy,
  where,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getLectureProgress, unlockLecture } from "@/lib/studentProgress";
import styles from "../courses.module.css";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IoLockClosed,
  IoLockOpen,
  IoChevronBackCircleSharp,
} from "react-icons/io5";
import { MdQuiz } from "react-icons/md";
import { FaPlay } from "react-icons/fa";

interface Lecture extends DocumentData {
  id: string;
  title: string;
  odyseeName: string;
  odyseeId: string;
  homeworkLink?: string;
  order: number;
  hasQuiz?: boolean;
  isHidden?: boolean;
}

interface ProgressData {
  quizCompleted?: boolean;
  score?: number;
  totalQuestions?: number;
  unlocked?: boolean;
}

function LecturesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const courseId = searchParams.get("courseId") as string;
  const year = searchParams.get("year") as string;

  const [courseLectures, setCourseLectures] = useState<Lecture[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [progressMap, setProgressMap] = useState<
    Record<string, ProgressData | undefined>
  >({});
  const [loadingLectures, setLoadingLectures] = useState(true);
  const [accessCode, setAccessCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchLectures = async () => {
      if (!courseId || !year) {
        setLoadingLectures(false);
        return;
      }

      setLoadingLectures(true);
      try {
        const lecturesRef = collection(
          db,
          `years/${year}/courses/${courseId}/lectures`
        );
        const q = query(
          lecturesRef,
          where("isHidden", "==", false),
          orderBy("order")
        );
        const snapshot = await getDocs(q);

        const fetchedLectures: Lecture[] = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const lectureData = {
              id: docSnap.id,
              ...docSnap.data(),
            } as Lecture;
            const quizRef = collection(
              db,
              `years/${year}/courses/${courseId}/lectures/${lectureData.id}/quizzes`
            );
            const quizSnapshot = await getDocs(quizRef);
            lectureData.hasQuiz = !quizSnapshot.empty;
            return lectureData;
          })
        );

        setCourseLectures(fetchedLectures);
      } catch (error) {
        console.error("Error fetching lectures:", error);
      } finally {
        setLoadingLectures(false);
      }
    };
    fetchLectures();
  }, [courseId, year]);

  useEffect(() => {
    if (!user || courseLectures.length === 0) {
      setProgressMap({});
      return;
    }

    const loadProgress = async () => {
      const progressPromises = courseLectures.map((lecture) =>
        getLectureProgress(user.uid, year, courseId, lecture.id)
      );

      const allProgress = await Promise.all(progressPromises);
      const map: Record<string, ProgressData> = {};

      allProgress.forEach((progress, index) => {
        const lecture = courseLectures[index];
        const key = `${year}_${courseId}_${lecture.id}`;
        map[key] = progress;
      });

      setProgressMap(map);
    };

    loadProgress();
  }, [user, courseLectures, courseId, year]);

  const quizzesCompleted = courseLectures.filter(
    (lecture) =>
      lecture.hasQuiz &&
      progressMap[`${year}_${courseId}_${lecture.id}`]?.quizCompleted
  ).length;
  const totalQuizzes = courseLectures.filter(
    (lecture) => lecture.hasQuiz
  ).length;
  const progressPercentage =
    totalQuizzes > 0 ? (quizzesCompleted / totalQuizzes) * 100 : 0;

  const handleCodeSubmit = useCallback(
    async (lectureId: string) => {
      if (!user || !accessCode) {
        setErrorMessage("Please enter a code.");
        return;
      }

      setUnlocking(true);
      setErrorMessage("");

      try {
        const codesRef = collection(db, `accessCodes`);
        const q = query(codesRef, where("code", "==", accessCode));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setErrorMessage("Invalid or already used code.");
          setUnlocking(false);
          return;
        }

        const codeDoc = querySnapshot.docs[0];
        const codeDocData = codeDoc.data();
        const codeDocRef = codeDoc.ref;

        if (codeDocData?.isUsed) {
          setErrorMessage("Invalid or already used code.");
          setUnlocking(false);
          return;
        }

        await updateDoc(codeDocRef, {
          isUsed: true,
          usedBy: user.uid,
          usedAt: new Date(),
          lectureId,
          courseId,
          year,
        });

        // ✅ Save unlocked flag in correct path
        await unlockLecture(user.uid, year, courseId, lectureId);

        setProgressMap((prev) => ({
          ...prev,
          [`${year}_${courseId}_${lectureId}`]: {
            ...(prev[`${year}_${courseId}_${lectureId}`] || {}),
            unlocked: true,
          },
        }));

        setShowCodeInput(null);
        setAccessCode("");
      } catch (error) {
        console.error("Error unlocking lecture:", error);
        setErrorMessage("An error occurred. Please try again.");
      } finally {
        setUnlocking(false);
      }
    },
    [user, accessCode, courseId, year]
  );

  return (
    <div className={styles.wrapper}>
      <button onClick={() => router.push("/courses")}>
        <IoChevronBackCircleSharp /> Back to Courses
      </button>
      <h1>Lectures</h1>

      {totalQuizzes > 0 && (
        <div className={styles.progressBarContainer}>
          <p>
            <strong>Progress:</strong> {quizzesCompleted} / {totalQuizzes}{" "}
            quizzes completed
          </p>
          <div className={styles.progressBar}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {loadingLectures ? (
        <p>Loading lectures...</p>
      ) : courseLectures.length === 0 ? (
        <p>No lectures available for this course.</p>
      ) : (
        <div className={styles.lectureList}>
          {courseLectures.map((lecture, index) => {
            const key = `${year}_${courseId}_${lecture.id}`;
            const progress = progressMap[key];

            const previousLecture = courseLectures[index - 1];

            // 💡 NEW LOGIC: check if the previous lecture itself is unlocked
            const isPreviousLectureUnlocked =
              !previousLecture ||
              progressMap[`${year}_${courseId}_${previousLecture.id}`]
                ?.unlocked;

            const previousQuizIsCompleted =
              !previousLecture ||
              !previousLecture.hasQuiz ||
              progressMap[`${year}_${courseId}_${previousLecture.id}`]
                ?.quizCompleted;
            const isUnlockedByCode = progress?.unlocked;

            // 💡 NEW LOGIC: A lecture is locked if it's not unlocked by a code OR if the previous one isn't fully completed
            const isLocked = !isUnlockedByCode || !previousQuizIsCompleted;
            const canUnlockWithCode =
              isPreviousLectureUnlocked && !isUnlockedByCode;

            const lectureUrl = isLocked
              ? "#"
              : lecture.hasQuiz && !progress?.quizCompleted
              ? `/courses/lectures/quiz?year=${year}&courseId=${courseId}&lectureId=${lecture.id}`
              : `/courses/lectures/lecture?year=${year}&courseId=${courseId}&lectureId=${lecture.id}&odyseeName=${lecture.odyseeName}&odyseeId=${lecture.odyseeId}&title=${lecture.title}`;

            return (
              <div
                key={lecture.id}
                className={`${styles.lectureCard} ${
                  isLocked ? styles.lockedCard : ""
                }`}
              >
                <h3>
                  {isLocked ? <IoLockClosed /> : <IoLockOpen />} Lecture{" "}
                  {index + 1}
                </h3>

                {isLocked ? (
                  <>
                    <p>
                      {previousQuizIsCompleted
                        ? "Enter a code to unlock this lecture."
                        : "Complete the quiz for the previous lecture to unlock."}
                    </p>
                    {/* Only show "Unlock with Code" if the previous lecture is completely unlocked */}
                    {canUnlockWithCode && (
                      <button onClick={() => setShowCodeInput(lecture.id)}>
                        Unlock with Code
                      </button>
                    )}
                    {showCodeInput === lecture.id && (
                      <div
                        style={{
                          paddingTop: "10px",
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <input
                          type="text"
                          value={accessCode}
                          onChange={(e) => setAccessCode(e.target.value)}
                          placeholder="Enter code"
                          disabled={unlocking}
                        />
                        <button
                          onClick={() => handleCodeSubmit(lecture.id)}
                          disabled={unlocking}
                        >
                          {unlocking ? "Unlocking..." : "Submit"}
                        </button>
                        {errorMessage && (
                          <p className={styles.errorMessage}>{errorMessage}</p>
                        )}
                        To get Codes send 150egp via Vodafone Cash
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {lecture.hasQuiz && progress?.quizCompleted && (
                      <p className={styles.quizScore}>
                        Quiz Completed: {progress?.score} /{" "}
                        {progress?.totalQuestions}
                      </p>
                    )}
                    <div className={styles.buttonGroup}>
                      <button onClick={() => router.push(lectureUrl)}>
                        {lecture.hasQuiz && !progress?.quizCompleted ? (
                          <>
                            <MdQuiz /> Take Quiz
                          </>
                        ) : (
                          <>
                            <FaPlay /> View Lecture
                          </>
                        )}
                      </button>
                      {lecture.homeworkLink && (
                        <a
                          href={lecture.homeworkLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <button>
                            <FaPlay /> Watch H.w
                          </button>
                        </a>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LecturesPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <LecturesContent />
    </Suspense>
  );
}
