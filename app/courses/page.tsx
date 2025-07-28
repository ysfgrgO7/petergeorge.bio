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

  useEffect(() => {
    const fetchCourses = async () => {
      const snapshot = await getDocs(collection(db, "courses"));
      const fetched = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Course[];
      setCourses(fetched);
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

                {!progress?.quizCompleted ? (
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
