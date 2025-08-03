"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLectureProgress } from "@/lib/studentProgress";
import styles from "./courses.module.css";

interface Lecture {
  title: string;
  odyseeName: string;
  odyseeId: string;
  hasQuiz?: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  year: string;
  lectures: Lecture[];
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [studentCode, setStudentCode] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, any>>({});
  const [loadingCourses, setLoadingCourses] = useState(true); // New loading state

  useEffect(() => {
    const fetchCourses = async () => {
      setLoadingCourses(true); // Start loading
      const snapshot = await getDocs(collection(db, "courses"));
      const fetchedCourses: Course[] = [];

      for (const doc of snapshot.docs) {
        const courseData = {
          id: doc.id,
          ...doc.data(),
        } as Course;
        if (courseData.lectures && Array.isArray(courseData.lectures)) {
          for (let i = 0; i < courseData.lectures.length; i++) {
            const lecture = courseData.lectures[i];
            const quizRef = collection(
              db,
              "courses",
              courseData.id,
              "lectures",
              String(i),
              "quizzes"
            );
            const quizSnapshot = await getDocs(quizRef);
            lecture.hasQuiz = !quizSnapshot.empty;
          }
        }
        fetchedCourses.push(courseData);
      }
      setCourses(fetchedCourses);
      setLoadingCourses(false);
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    const code = localStorage.getItem("studentCode");
    setStudentCode(code);
    if (!code || courses.length === 0) return;

    const loadProgress = async () => {
      const map: Record<string, any> = {};
      for (const course of courses) {
        for (let i = 0; i < (course.lectures?.length || 0); i++) {
          const progress = await getLectureProgress(code, course.id, i);
          map[`${course.id}_${i}`] = progress;
        }
      }
      setProgressMap(map);
    };

    loadProgress();
  }, [courses]);

  return (
    <div className={styles.wrapper}>
      <h1>Available Courses</h1>

      {loadingCourses ? (
        <p>Loading courses...</p>
      ) : (
        <>
          {!selectedCourse ? (
            <div className={styles.courseList}>
              {courses.map((course) => (
                <div key={course.id} className={styles.courseCard}>
                  <h2>{course.title}</h2>
                  <p>{course.description}</p>
                  <p>
                    <strong>Year:</strong> {course.year.toUpperCase()}
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

              {selectedCourse.lectures?.map((lecture, index) => {
                const key = `${selectedCourse.id}_${index}`;
                const progress = progressMap[key];

                return (
                  <div key={index} className={styles.lecture}>
                    <h3>{lecture.title}</h3>

                    {lecture.hasQuiz ? (
                      !progress?.quizCompleted ? (
                        <button
                          onClick={() =>
                            (window.location.href = `/courses/quiz?courseId=${selectedCourse.id}&lectureIndex=${index}`)
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
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
