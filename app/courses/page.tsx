"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  DocumentData,
  query,
  orderBy,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLectureProgress } from "@/lib/studentProgress";
import styles from "./courses.module.css";

interface Lecture extends DocumentData {
  id: string;
  title: string;
  odyseeName: string;
  odyseeId: string;
  order: number;
  hasQuiz?: boolean;
  isHidden?: boolean;
}

interface Course extends DocumentData {
  id: string;
  title: string;
  description: string;
  year: "year1" | "year3 (Biology)" | "year3 (Geology)";
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [studentCode, setStudentCode] = useState<string | null>(null);
  const [studentYear, setStudentYear] = useState<string | null>(null);

  type LectureProgress = {
    quizCompleted?: boolean;
  };

  const [progressMap, setProgressMap] = useState<
    Record<string, LectureProgress | undefined>
  >({});
  const [loadingCourses, setLoadingCourses] = useState(true);

  const [courseLectures, setCourseLectures] = useState<Lecture[]>([]);
  const [loadingLectures, setLoadingLectures] = useState(false);

  // --- Fetch Student's Year from Firestore ---
  useEffect(() => {
    const getStudentYear = async (code: string) => {
      try {
        const studentRef = doc(db, "students", code);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const data = studentSnap.data();
          if (data && data.year) {
            setStudentYear(data.year);
          }
        }
      } catch (error) {
        console.error("Error fetching student year:", error);
      }
    };

    const code = localStorage.getItem("studentCode");
    if (code) {
      setStudentCode(code);
      getStudentYear(code);
    } else {
      setLoadingCourses(false);
    }
  }, []);

  // --- Fetch Courses for Student's Year (and year3 sub-years) ---
  useEffect(() => {
    const fetchCourses = async () => {
      if (!studentYear) {
        return;
      }

      setLoadingCourses(true);
      try {
        const fetchedCourses: Course[] = [];
        const yearsToFetch =
          studentYear === "year3"
            ? ["year3 (Biology)", "year3 (Geology)"]
            : [studentYear];

        for (const year of yearsToFetch) {
          const coursesRef = collection(db, "years", year, "courses");
          const snapshot = await getDocs(coursesRef);
          snapshot.docs.forEach((docSnap) => {
            fetchedCourses.push({
              id: docSnap.id,
              ...docSnap.data(),
              year: year as "year1" | "year3 (Biology)" | "year3 (Geology)",
            } as Course);
          });
        }

        setCourses(fetchedCourses);
      } catch (error) {
        console.error(`Error fetching courses:`, error);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [studentYear]);

  // --- Fetch Lectures for Selected Course ---
  useEffect(() => {
    const fetchLectures = async () => {
      if (!selectedCourse) {
        setCourseLectures([]);
        return;
      }

      setLoadingLectures(true);
      try {
        const lecturesRef = collection(
          db,
          `years/${selectedCourse.year}/courses/${selectedCourse.id}/lectures`
        );

        const q = query(
          lecturesRef,
          where("isHidden", "==", false),
          orderBy("order")
        );

        const snapshot = await getDocs(q);
        const fetchedLectures: Lecture[] = [];

        for (const doc of snapshot.docs) {
          const lectureData = {
            id: doc.id,
            ...doc.data(),
          } as Lecture;

          const quizRef = collection(
            db,
            `years/${selectedCourse.year}/courses/${selectedCourse.id}/lectures/${lectureData.id}/quizzes`
          );
          const quizSnapshot = await getDocs(quizRef);
          lectureData.hasQuiz = !quizSnapshot.empty;
          fetchedLectures.push(lectureData);
        }
        setCourseLectures(fetchedLectures);
      } catch (error) {
        console.error(
          `Error fetching lectures for course ${selectedCourse.id}:`,
          error
        );
      } finally {
        setLoadingLectures(false);
      }
    };

    fetchLectures();
  }, [selectedCourse]);

  // --- Load Student Progress ---
  useEffect(() => {
    if (!studentCode || !selectedCourse || courseLectures.length === 0) {
      setProgressMap({});
      return;
    }

    const loadProgress = async () => {
      const map: Record<string, LectureProgress | undefined> = {};
      for (const lecture of courseLectures) {
        const progress = await getLectureProgress(
          studentCode,
          selectedCourse.year,
          selectedCourse.id,
          lecture.id
        );
        map[`${selectedCourse.id}_${lecture.id}`] = progress;
      }
      setProgressMap(map);
    };

    loadProgress();
  }, [studentCode, selectedCourse, courseLectures]);

  return (
    <div className={styles.wrapper}>
      <h1>Available Courses</h1>

      {loadingCourses ? (
        <p>Loading courses...</p>
      ) : (
        <>
          {!selectedCourse ? (
            <div className={styles.courseList}>
              {courses.length === 0 && <p>No courses available.</p>}
              {courses.map((course) => (
                <div key={course.id} className={styles.courseCard}>
                  <h2>{course.title}</h2>
                  <p>{course.description}</p>
                  <p>
                    <strong>Year:</strong> {course.year}
                  </p>
                  <button onClick={() => setSelectedCourse(course)}>
                    View Lectures
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.courseDetail}>
              <button onClick={() => setSelectedCourse(null)}>
                ← Back to Courses
              </button>
              <h2>{selectedCourse.title} - Lectures</h2>

              {loadingLectures ? (
                <p>Loading lectures...</p>
              ) : courseLectures.length === 0 ? (
                <p>No lectures available for this course.</p>
              ) : (
                courseLectures.map((lecture) => {
                  const key = `${selectedCourse.id}_${lecture.id}`;
                  const progress = progressMap[key];

                  return (
                    <div key={lecture.id} className={styles.lecture}>
                      <h3>{lecture.title}</h3>
                      {lecture.hasQuiz ? (
                        !progress?.quizCompleted ? (
                          <button
                            onClick={() =>
                              (window.location.href = `/courses/quiz?year=${selectedCourse.year}&courseId=${selectedCourse.id}&lectureId=${lecture.id}`)
                            }
                          >
                            📝 Take Quiz to Unlock Video
                          </button>
                        ) : (
                          <iframe
                            src={`https://odysee.com/$/embed/${lecture.odyseeName}/${lecture.odyseeId}`}
                            width="100%"
                            height="315"
                            allowFullScreen
                            frameBorder="0"
                          />
                        )
                      ) : (
                        <iframe
                          src={`https://odysee.com/$/embed/${lecture.odyseeName}/${lecture.odyseeId}`}
                          width="100%"
                          height="315"
                          allowFullScreen
                          frameBorder="0"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
