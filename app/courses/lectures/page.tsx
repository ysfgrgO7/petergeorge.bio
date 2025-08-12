"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  DocumentData,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getLectureProgress } from "@/lib/studentProgress";
import styles from "../courses.module.css";
import { useRouter, useSearchParams } from "next/navigation";
import { IoLockClosed, IoLockOpen, IoChevronBackCircleSharp  } from "react-icons/io5";
import { MdQuiz } from "react-icons/md";
import { FaPlay } from "react-icons/fa";

interface Lecture extends DocumentData {
  id: string;
  title: string;
  odyseeName: string;
  odyseeId: string;
  order: number;
  hasQuiz?: boolean;
  isHidden?: boolean;
}

interface ProgressData {
  quizCompleted?: boolean;
  score?: number;
  totalQuestions?: number;
}

export default function LecturesPage() {
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

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
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
        console.error("Missing courseId or year in URL");
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
        const key = `${courseId}_${lecture.id}`;
        map[key] = progress;
      });
      setProgressMap(map);
    };

    loadProgress();
  }, [user, courseLectures, courseId, year]);

  const quizzesCompleted = courseLectures.filter(
    (lecture) =>
      lecture.hasQuiz && progressMap[`${courseId}_${lecture.id}`]?.quizCompleted
  ).length;
  const totalQuizzes = courseLectures.filter(
    (lecture) => lecture.hasQuiz
  ).length;
  const progressPercentage =
    totalQuizzes > 0 ? (quizzesCompleted / totalQuizzes) * 100 : 0;

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
            const key = `${courseId}_${lecture.id}`;
            const progress = progressMap[key];

            const previousLecture = courseLectures[index - 1];
            const previousQuizIsCompleted =
              !previousLecture ||
              !previousLecture.hasQuiz ||
              progressMap[`${courseId}_${previousLecture.id}`]?.quizCompleted;

            const isLocked = index > 0 && !previousQuizIsCompleted;

            // Determine the URL based on quiz completion
            const lectureUrl =
              lecture.hasQuiz && !progress?.quizCompleted
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
                  <p>Complete the quiz for the previous lecture to unlock.</p>
                ) : (
                  <>
                    {lecture.hasQuiz && progress?.quizCompleted && (
                      <p className={styles.quizScore}>
                        Quiz Completed: {progress.score} /{" "}
                        {progress.totalQuestions}
                      </p>
                    )}
                    <a
                      href={lectureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <button>
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
                    </a>
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
