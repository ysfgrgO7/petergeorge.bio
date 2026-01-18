"use client";

import { useEffect, useState, Suspense, useCallback, useMemo } from "react";
import {
  collection,
  getDocs,
  DocumentData,
  query,
  orderBy,
  where,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getLectureProgress, unlockLecture } from "@/lib/studentProgress";
import { getRandomQuizVariant } from "@/lib/quizUtils";
import styles from "../courses.module.css";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IoLockClosed,
  IoLockOpen,
  IoChevronBackCircleSharp,
} from "react-icons/io5";
import { MdQuiz } from "react-icons/md";
import { FaPlay } from "react-icons/fa";
import { useTheme } from "@/app/components/ThemeProvider";
import Loading from "@/app/components/Loading";

interface Lecture extends DocumentData {
  id: string;
  title: string;
  odyseeName: string;
  odyseeId: string;
  homeworkLink?: string;
  order: number;
  hasQuiz?: boolean;
  hasHomework?: boolean;
  isHidden?: boolean;
}

interface ProgressData {
  quizCompleted?: boolean;
  earnedMarks?: number;
  totalPossibleMarks?: number;
  totalQuestions?: number;
  unlocked?: boolean;
  attempts?: number;
  usedVariants?: string[];
}

interface HomeworkProgressData {
  homeworkCompleted?: boolean;
  score?: number;
}

// Constants
const MAX_ATTEMPTS = 3;
const ACCESS_CODE_PAYMENT = "150egp via Vodafone Cash";

function LecturesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const courseId = searchParams.get("courseId") as string;
  const year = searchParams.get("year") as string;

  // State
  const { isDef, isHalloween, isXmas, isRamadan } = useTheme();
  const [courseLectures, setCourseLectures] = useState<Lecture[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [studentSystem, setStudentSystem] = useState<string>("");
  const [progressMap, setProgressMap] = useState<Record<string, ProgressData>>(
    {},
  );
  const [homeworkProgressMap, setHomeworkProgressMap] = useState<
    Record<string, HomeworkProgressData>
  >({});
  const [loadingLectures, setLoadingLectures] = useState(true);
  const [accessCode, setAccessCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Helper functions
  const getProgressKey = useCallback(
    (lectureId: string) => `${year}_${courseId}_${lectureId}`,
    [year, courseId],
  );

  const resetCodeInput = useCallback(() => {
    setShowCodeInput(null);
    setAccessCode("");
    setErrorMessage("");
  }, []);

  // Check if lecture has homework
  const checkLectureHasHomework = useCallback(
    async (lectureId: string): Promise<boolean> => {
      try {
        const homeworkQuestionsRef = collection(
          db,
          `years/${year}/courses/${courseId}/lectures/${lectureId}/homeworkQuestions`,
        );
        const homeworkSnapshot = await getDocs(homeworkQuestionsRef);
        return !homeworkSnapshot.empty;
      } catch (error) {
        console.warn(
          `Failed to check homework for lecture ${lectureId}:`,
          error,
        );
        return false;
      }
    },
    [year, courseId],
  );

  // Get homework progress for a lecture
  const getHomeworkProgress = useCallback(
    async (lectureId: string): Promise<HomeworkProgressData> => {
      if (!user) return {};

      try {
        const homeworkProgressRef = doc(
          db,
          `students/${user.uid}/homeworkProgress/${year}_${courseId}_${lectureId}`,
        );
        const homeworkProgressSnap = await getDoc(homeworkProgressRef);
        return homeworkProgressSnap.exists()
          ? (homeworkProgressSnap.data() as HomeworkProgressData)
          : {};
      } catch (error) {
        console.warn(
          `Failed to get homework progress for lecture ${lectureId}:`,
          error,
        );
        return {};
      }
    },
    [user, year, courseId],
  );

  // Memoized calculations
  const { quizzesCompleted, totalQuizzes, progressPercentage } = useMemo(() => {
    const lecturesWithQuiz = courseLectures.filter(
      (lecture) => lecture.hasQuiz,
    );
    const completed = lecturesWithQuiz.filter(
      (lecture) => progressMap[getProgressKey(lecture.id)]?.quizCompleted,
    ).length;

    return {
      quizzesCompleted: completed,
      totalQuizzes: lecturesWithQuiz.length,
      progressPercentage:
        lecturesWithQuiz.length > 0
          ? (completed / lecturesWithQuiz.length) * 100
          : 0,
    };
  }, [courseLectures, progressMap, getProgressKey]);

  // Enhanced lecture access logic with homework checking
  const getLectureAccessInfo = useCallback(
    (lecture: Lecture, index: number) => {
      const progress = progressMap[getProgressKey(lecture.id)];
      const previousLecture = courseLectures[index - 1];
      const isSchoolSystem = studentSystem.toLowerCase() === "school";

      // For school system, check only homework and quiz completion
      if (isSchoolSystem) {
        // First lecture is always unlocked for school students
        if (index === 0) {
          return {
            isLocked: false,
            canUnlockWithCode: false,
            lockReason: null,
          };
        }

        const previousProgress =
          progressMap[getProgressKey(previousLecture.id)];
        const previousHomeworkProgress =
          homeworkProgressMap[getProgressKey(previousLecture.id)];

        const isPreviousQuizCompleted =
          (!previousLecture.hasQuiz || previousProgress?.quizCompleted) ??
          false;
        const isPreviousHomeworkCompleted =
          (!previousLecture.hasHomework ||
            previousHomeworkProgress?.homeworkCompleted) ??
          false;

        const isLocked =
          !isPreviousQuizCompleted || !isPreviousHomeworkCompleted;

        let lockReason = null;
        if (!isPreviousQuizCompleted) {
          lockReason = "Complete the quiz for the previous lecture to unlock.";
        } else if (!isPreviousHomeworkCompleted) {
          lockReason =
            "Complete the homework for the previous lecture to unlock.";
        }

        return {
          isLocked,
          canUnlockWithCode: false,
          lockReason,
        };
      }

      // For non-school systems, use code-based unlocking
      // First lecture is always unlockable with code
      if (index === 0) {
        return {
          isLocked: !progress?.unlocked,
          canUnlockWithCode: !progress?.unlocked,
          lockReason: progress?.unlocked
            ? null
            : "Enter a code to unlock this lecture.",
        };
      }

      const previousProgress = progressMap[getProgressKey(previousLecture.id)];
      const previousHomeworkProgress =
        homeworkProgressMap[getProgressKey(previousLecture.id)];

      const isPreviousUnlocked = previousProgress?.unlocked ?? false;
      const isPreviousQuizCompleted =
        (!previousLecture.hasQuiz || previousProgress?.quizCompleted) ?? false;
      const isPreviousHomeworkCompleted =
        (!previousLecture.hasHomework ||
          previousHomeworkProgress?.homeworkCompleted) ??
        false;

      const isUnlockedByCode = progress?.unlocked ?? false;
      const isLocked =
        !isUnlockedByCode ||
        !isPreviousQuizCompleted ||
        !isPreviousHomeworkCompleted;

      let lockReason = null;
      let canUnlockWithCode = false;

      if (!isPreviousUnlocked) {
        lockReason = "Previous lecture must be unlocked first.";
        canUnlockWithCode = false;
      } else if (!isPreviousQuizCompleted) {
        lockReason = "Complete the quiz for the previous lecture to unlock.";
        canUnlockWithCode = false;
      } else if (!isPreviousHomeworkCompleted) {
        lockReason =
          "Complete the homework for the previous lecture to unlock.";
        canUnlockWithCode = false;
      } else if (!isUnlockedByCode) {
        lockReason = "Enter a code to unlock this lecture.";
        canUnlockWithCode = true;
      }

      return {
        isLocked,
        canUnlockWithCode,
        lockReason,
      };
    },
    [
      courseLectures,
      progressMap,
      homeworkProgressMap,
      getProgressKey,
      studentSystem,
    ],
  );

  // Get lecture URL based on state
  const getLectureUrl = useCallback(
    (lecture: Lecture, isLocked: boolean, progress?: ProgressData) => {
      if (isLocked) return "#";

      const baseParams = `year=${year}&courseId=${courseId}&lectureId=${lecture.id}`;

      if (lecture.hasQuiz && !progress?.quizCompleted) {
        return `/courses/lectures/quiz?${baseParams}`;
      }

      return `/courses/lectures/lecture?${baseParams}&odyseeName=${
        lecture.odyseeName
      }&odyseeId=${lecture.odyseeId}&title=${encodeURIComponent(
        lecture.title,
      )}`;
    },
    [year, courseId],
  );

  // Auth effect - Fetch student system
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);

      // Fetch student system
      try {
        const studentRef = doc(db, "students", currentUser.uid);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const studentData = studentSnap.data();
          setStudentSystem(studentData.system || "");
        }
      } catch (error) {
        console.error("Error fetching student system:", error);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch lectures effect
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
          `years/${year}/courses/${courseId}/lectures`,
        );
        const q = query(
          lecturesRef,
          where("isHidden", "==", false),
          orderBy("order"),
        );
        const snapshot = await getDocs(q);

        // Check for quizzes and homework in parallel
        const lecturePromises = snapshot.docs.map(async (docSnap) => {
          const lectureData = { id: docSnap.id, ...docSnap.data() } as Lecture;

          try {
            // Check for quiz
            const randomVariant = getRandomQuizVariant();
            const quizRef = collection(
              db,
              `years/${year}/courses/${courseId}/lectures/${lectureData.id}/${randomVariant}`,
            );
            const quizSnapshot = await getDocs(quizRef);
            lectureData.hasQuiz = !quizSnapshot.empty;

            // Check for homework
            const hasHomework = await checkLectureHasHomework(lectureData.id);
            lectureData.hasHomework = hasHomework;
          } catch (error) {
            console.warn(
              `Failed to check quiz/homework for lecture ${lectureData.id}:`,
              error,
            );
            lectureData.hasQuiz = false;
            lectureData.hasHomework = false;
          }

          return lectureData;
        });

        const fetchedLectures = await Promise.all(lecturePromises);
        setCourseLectures(fetchedLectures);
      } catch (error) {
        console.error("Error fetching lectures:", error);
        setCourseLectures([]);
      } finally {
        setLoadingLectures(false);
      }
    };

    fetchLectures();
  }, [courseId, year, checkLectureHasHomework]);

  // Load progress effect
  useEffect(() => {
    if (!user || courseLectures.length === 0) {
      setProgressMap({});
      setHomeworkProgressMap({});
      return;
    }

    const loadProgress = async () => {
      try {
        // Load lecture progress
        const progressPromises = courseLectures.map((lecture) =>
          getLectureProgress(user.uid, year, courseId, lecture.id),
        );

        // Load homework progress
        const homeworkProgressPromises = courseLectures.map((lecture) =>
          getHomeworkProgress(lecture.id),
        );

        const [allProgress, allHomeworkProgress] = await Promise.all([
          Promise.all(progressPromises),
          Promise.all(homeworkProgressPromises),
        ]);

        // Build progress maps
        const progressMap: Record<string, ProgressData> = {};
        const homeworkMap: Record<string, HomeworkProgressData> = {};

        allProgress.forEach((progress, index) => {
          const lecture = courseLectures[index];
          const key = getProgressKey(lecture.id);
          progressMap[key] = progress || {};
        });

        allHomeworkProgress.forEach((homeworkProgress, index) => {
          const lecture = courseLectures[index];
          const key = getProgressKey(lecture.id);
          homeworkMap[key] = homeworkProgress || {};
        });

        setProgressMap(progressMap);
        setHomeworkProgressMap(homeworkMap);
      } catch (error) {
        console.error("Error loading progress:", error);
        setProgressMap({});
        setHomeworkProgressMap({});
      }
    };

    loadProgress();
  }, [
    user,
    courseLectures,
    courseId,
    year,
    getProgressKey,
    getHomeworkProgress,
  ]);

  // Enhanced code submission
  const handleCodeSubmit = useCallback(
    async (lectureId: string) => {
      if (!user || !accessCode.trim()) {
        setErrorMessage("Please enter a valid code.");
        return;
      }

      setUnlocking(true);
      setErrorMessage("");

      try {
        const codesRef = collection(db, "accessCodes");
        const q = query(codesRef, where("code", "==", accessCode.trim()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setErrorMessage("Invalid code. Please check and try again.");
          return;
        }

        const codeDoc = querySnapshot.docs[0];
        const codeData = codeDoc.data();

        if (codeData?.isUsed) {
          setErrorMessage("This code has already been used.");
          return;
        }

        // Update code as used
        await updateDoc(codeDoc.ref, {
          isUsed: true,
          usedBy: user.uid,
          usedAt: new Date(),
          lectureId,
          courseId,
          year,
        });

        // Unlock lecture
        await unlockLecture(user.uid, year, courseId, lectureId);

        // Update local state
        setProgressMap((prev) => ({
          ...prev,
          [getProgressKey(lectureId)]: {
            ...prev[getProgressKey(lectureId)],
            unlocked: true,
          },
        }));

        resetCodeInput();
      } catch (error) {
        console.error("Error unlocking lecture:", error);
        setErrorMessage("An error occurred. Please try again later.");
      } finally {
        setUnlocking(false);
      }
    },
    [user, accessCode, courseId, year, getProgressKey, resetCodeInput],
  );

  // Render quiz score information
  const renderQuizInfo = useCallback(
    (lecture: Lecture, progress: ProgressData) => {
      if (!lecture.hasQuiz) return null;

      const hasAttempted =
        progress.earnedMarks !== undefined && progress.earnedMarks !== null;
      const maxAttemptsReached = (progress.attempts || 0) >= MAX_ATTEMPTS;
      const quizCompleted = progress.quizCompleted;

      return (
        <div className={styles.quizInfo}>
          {hasAttempted && (
            <p
              className={`${styles.quizScore} ${
                !quizCompleted ? styles.failedQuiz : ""
              }`}
            >
              {quizCompleted ? "Quiz Completed" : "Last Score"}:{" "}
              {progress.earnedMarks} /{" "}
              {progress.totalPossibleMarks || progress.totalQuestions}
            </p>
          )}

          {progress.attempts && progress.attempts > 0 && (
            <p className={styles.attemptCount}>
              Attempts: {progress.attempts} / {MAX_ATTEMPTS}
            </p>
          )}

          {maxAttemptsReached && !quizCompleted && (
            <p className={styles.maxAttemptsMessage}>
              Maximum attempts reached. Contact Support for help.
            </p>
          )}
        </div>
      );
    },
    [],
  );

  // Render homework info
  const renderHomeworkInfo = useCallback(
    (lecture: Lecture) => {
      if (!lecture.hasHomework) return null;

      const homeworkProgress =
        homeworkProgressMap[getProgressKey(lecture.id)] || {};
      const isCompleted = homeworkProgress.homeworkCompleted;

      return (
        <div className={styles.homeworkInfo}>
          <p
            className={`${styles.homeworkStatus} ${
              isCompleted ? styles.completedHomework : styles.pendingHomework
            }`}
          >
            Homework: {isCompleted ? "Completed" : "Pending"}
            {homeworkProgress.score !== undefined && (
              <span> - Score: {homeworkProgress.score}</span>
            )}
          </p>
        </div>
      );
    },
    [homeworkProgressMap, getProgressKey],
  );

  // Render unlock interface
  const renderUnlockInterface = useCallback(
    (lecture: Lecture, lockReason: string, canUnlockWithCode: boolean) => (
      <>
        <p>{lockReason}</p>
        {canUnlockWithCode && (
          <>
            <button onClick={() => setShowCodeInput(lecture.id)}>
              Unlock with Code
            </button>
            {showCodeInput === lecture.id && (
              <div className={styles.codeInput}>
                <div className={styles.inputGroup}>
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Enter access code"
                    disabled={unlocking}
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleCodeSubmit(lecture.id)
                    }
                  />
                  <button
                    onClick={() => handleCodeSubmit(lecture.id)}
                    disabled={unlocking || !accessCode.trim()}
                  >
                    {unlocking ? "Unlocking..." : "Submit"}
                  </button>
                  <button
                    type="button"
                    onClick={resetCodeInput}
                    disabled={unlocking}
                  >
                    Cancel
                  </button>
                </div>
                {errorMessage && (
                  <p className={styles.errorMessage}>{errorMessage}</p>
                )}
                <p className={styles.paymentInfo}>
                  To get codes, send {ACCESS_CODE_PAYMENT}
                </p>
              </div>
            )}
          </>
        )}
      </>
    ),
    [
      accessCode,
      showCodeInput,
      unlocking,
      errorMessage,
      handleCodeSubmit,
      resetCodeInput,
    ],
  );

  // Render lecture action button
  const renderActionButton = useCallback(
    (lecture: Lecture, progress: ProgressData, lectureUrl: string) => {
      if (!lecture.hasQuiz) {
        return (
          <button onClick={() => router.push(lectureUrl)}>
            <FaPlay /> View Lecture
          </button>
        );
      }

      const maxAttemptsReached = (progress.attempts || 0) >= MAX_ATTEMPTS;
      const quizCompleted = progress.quizCompleted;
      const hasAttempted =
        progress.earnedMarks !== undefined && progress.earnedMarks !== null;

      if (maxAttemptsReached && !quizCompleted) {
        return null; // No button for max attempts reached
      }

      if (quizCompleted) {
        return (
          <button onClick={() => router.push(lectureUrl)}>
            <FaPlay /> View Lecture
          </button>
        );
      }

      return (
        <button onClick={() => router.push(lectureUrl)}>
          <MdQuiz /> {hasAttempted ? "Retake Quiz" : "Take Quiz"}
        </button>
      );
    },
    [router],
  );

  if (loadingLectures) {
    return (
      <div className="wrapper">
        <Loading text="Loading lectures..." />
      </div>
    );
  }

  if (!courseId || !year) {
    return (
      <div className="wrapper">
        <p>Invalid course parameters.</p>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <button
        onClick={() => router.push("/courses")}
        className={styles.backButton}
      >
        <IoChevronBackCircleSharp /> Back to Courses
      </button>

      <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
        {isHalloween && <h1>🎃</h1>}
        {isXmas && <h1>🎄</h1>}
        {isRamadan && <h1>🌙</h1>}
        <h1>Lectures</h1>
        {isHalloween && <h1>🎃</h1>}
        {isXmas && <h1>🎄</h1>}
        {isRamadan && <h1>🌙</h1>}
      </div>

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

      {courseLectures.length === 0 ? (
        <p>No lectures available for this course.</p>
      ) : (
        <div className={styles.lectureList}>
          {courseLectures.map((lecture, index) => {
            const progress = progressMap[getProgressKey(lecture.id)] || {};
            const { isLocked, canUnlockWithCode, lockReason } =
              getLectureAccessInfo(lecture, index);
            const lectureUrl = getLectureUrl(lecture, isLocked, progress);

            return (
              <div
                key={lecture.id}
                className={`${styles.lectureCard} ${
                  isLocked ? styles.lockedCard : ""
                }`}
              >
                <h3>
                  {isLocked ? (
                    <IoLockClosed style={{ color: "var(--red)" }} />
                  ) : (
                    <IoLockOpen style={{ color: "var(--green)" }} />
                  )}{" "}
                  {lecture.title}
                </h3>

                {isLocked ? (
                  renderUnlockInterface(lecture, lockReason!, canUnlockWithCode)
                ) : (
                  <>
                    {renderQuizInfo(lecture, progress)}
                    {renderHomeworkInfo(lecture)}
                    <div className={styles.buttonGroup}>
                      {renderActionButton(lecture, progress, lectureUrl)}
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
    <Suspense fallback={<Loading text="Loading lectures..." />}>
      <LecturesContent />
    </Suspense>
  );
}
