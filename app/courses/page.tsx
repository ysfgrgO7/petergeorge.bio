"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
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

  const fetchCourses = async () => {
    const snapshot = await getDocs(collection(db, "courses"));
    const fetched = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Course[];
    setCourses(fetched);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

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
          {selectedCourse.lectures?.length > 0 ? (
            selectedCourse.lectures.map((lecture, index) => (
              <div key={index} className={styles.lecture}>
                <h3>{lecture.title}</h3>
                <iframe
                  src={`https://odysee.com/$/embed/${lecture.odyseeName}/${lecture.odyseeId}`}
                  width="100%"
                  height="315"
                  allowFullScreen
                  frameBorder="0"
                />
              </div>
            ))
          ) : (
            <p>No lectures added yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
