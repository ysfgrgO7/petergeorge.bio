"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  DocumentData,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLectureProgress } from "@/lib/studentProgress"; // This function will need to be updated to accept year and lectureId
import styles from "./courses.module.css";

// Updated Lecture interface to reflect subcollection structure
interface Lecture extends DocumentData {
  id: string; // The document ID of the lecture in the subcollection
  title: string;
  odyseeName: string;
  odyseeId: string;
  order: number; // For sorting lectures
  hasQuiz?: boolean; // Still determined dynamically
}

// Updated Course interface (re-adding year field for frontend representation)
interface Course extends DocumentData {
  id: string; // The document ID of the course
  title: string;
  description: string;
  year: "year1" | "year3"; // Re-added year property for frontend display
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [studentCode, setStudentCode] = useState<string | null>(null);
  // Define a type for lecture progress (customize fields as needed)
  type LectureProgress = {
    quizCompleted?: boolean;
    // Add other progress fields if needed
  };

  const [progressMap, setProgressMap] = useState<
    Record<string, LectureProgress | undefined>
  >({}); // Key will now be `${courseId}_${lectureId}`
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Removed activeYearTab state as we will display all courses

  // New states for managing lectures within a selected course
  const [courseLectures, setCourseLectures] = useState<Lecture[]>([]);
  const [loadingLectures, setLoadingLectures] = useState(false);

  // --- Fetch All Courses (from both years) ---
  useEffect(() => {
    const fetchAllCourses = async () => {
      setLoadingCourses(true);
      try {
        const fetchedCourses: Course[] = [];

        // Fetch Year 1 courses
        const year1CoursesRef = collection(db, "years", "year1", "courses");
        const year1Snapshot = await getDocs(year1CoursesRef);
        year1Snapshot.docs.forEach((docSnap) => {
          fetchedCourses.push({
            id: docSnap.id,
            ...docSnap.data(),
            year: "year1", // Explicitly add year
          } as Course);
        });

        // Fetch Year 3 courses
        const year3CoursesRef = collection(db, "years", "year3", "courses");
        const year3Snapshot = await getDocs(year3CoursesRef);
        year3Snapshot.docs.forEach((docSnap) => {
          fetchedCourses.push({
            id: docSnap.id,
            ...docSnap.data(),
            year: "year3", // Explicitly add year
          } as Course);
        });

        setCourses(fetchedCourses);
      } catch (error) {
        console.error(`Error fetching all courses:`, error);
        // Optionally show an error message to the user
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchAllCourses();
  }, []); // Empty dependency array means this runs once on mount

  // --- Fetch Lectures for Selected Course ---
  useEffect(() => {
    const fetchLectures = async () => {
      if (!selectedCourse) {
        setCourseLectures([]);
        return;
      }

      setLoadingLectures(true);
      try {
        // Fetch lectures from the subcollection, ordered by 'order'
        // Use selectedCourse.year to construct the path
        const lecturesRef = collection(
          db,
          `years/${selectedCourse.year}/courses/${selectedCourse.id}/lectures`
        );
        const q = query(lecturesRef, orderBy("order"));
        const snapshot = await getDocs(q);
        const fetchedLectures: Lecture[] = [];

        for (const doc of snapshot.docs) {
          const lectureData = {
            id: doc.id,
            ...doc.data(),
          } as Lecture;

          // Check if quiz exists for this lecture
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
        // Optionally show an error message
      } finally {
        setLoadingLectures(false);
      }
    };

    fetchLectures();
  }, [selectedCourse]); // Only depend on selectedCourse, as year is now part of selectedCourse object

  // --- Load Student Progress ---
  useEffect(() => {
    const code = localStorage.getItem("studentCode");
    setStudentCode(code);

    // Only load progress if studentCode is available and lectures have been fetched for the selected course
    if (!code || !selectedCourse || courseLectures.length === 0) {
      setProgressMap({}); // Clear progress if no course selected or no lectures
      return;
    }

    const loadProgress = async () => {
      const map: Record<string, LectureProgress | undefined> = {};
      for (const lecture of courseLectures) {
        // getLectureProgress now needs year and lectureId
        const progress = await getLectureProgress(
          code,
          selectedCourse.year,
          selectedCourse.id,
          lecture.id
        );
        map[`${selectedCourse.id}_${lecture.id}`] = progress; // Key by courseId_lectureId
      }
      setProgressMap(map);
    };

    loadProgress();
  }, [studentCode, selectedCourse, courseLectures]); // Removed activeYearTab from dependencies

  return (
    <div className={styles.wrapper}>
      <h1>Available Courses</h1>

      {/* Removed Year Selection Tabs */}

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
                    {/* Display the year from the course object */}
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

              {loadingLectures ? (
                <p>Loading lectures...</p>
              ) : courseLectures.length === 0 ? (
                <p>No lectures available for this course.</p>
              ) : (
                courseLectures.map((lecture) => {
                  // Removed index as it's not directly used for key or path
                  const key = `${selectedCourse.id}_${lecture.id}`; // Use lecture.id for key
                  const progress = progressMap[key];

                  return (
                    <div key={lecture.id} className={styles.lecture}>
                      {" "}
                      {/* Use lecture.id as key */}
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
