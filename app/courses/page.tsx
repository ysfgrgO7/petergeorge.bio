"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  DocumentData,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import styles from "./courses.module.css";
import { useRouter } from "next/navigation";

interface Course extends DocumentData {
  id: string;
  title: string;
  description: string;
  year: "year1" | "year3 (Biology)" | "year3 (Geology)";
}

// Helper function to group and sort courses
const groupAndSortCourses = (courses: Course[]): Record<string, Course[]> => {
  const groupedCourses: Record<string, Course[]> = {};

  // Group courses by year
  courses.forEach((course) => {
    if (!groupedCourses[course.year]) {
      groupedCourses[course.year] = [];
    }
    groupedCourses[course.year].push(course);
  });

  // Sort courses within each year by title
  for (const year in groupedCourses) {
    groupedCourses[year].sort((a, b) => a.title.localeCompare(b.title));
  }

  return groupedCourses;
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentYear, setStudentYear] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const router = useRouter();

  // --- Get student info and check for admin status ---
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);

      try {
        const adminDocRef = doc(db, "admins", currentUser.email as string);
        const adminDocSnap = await getDoc(adminDocRef);
        const userIsAdmin = adminDocSnap.exists();
        setIsAdmin(userIsAdmin);

        if (!userIsAdmin) {
          const studentDocRef = doc(db, "students", currentUser.uid);
          const studentDocSnap = await getDoc(studentDocRef);

          if (studentDocSnap.exists()) {
            const studentData = studentDocSnap.data();
            setStudentYear(studentData.year || null);
          } else {
            console.error(
              "No student document found for UID:",
              currentUser.uid
            );
            setStudentYear(null);
          }
        } else {
          setStudentYear(null);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      } finally {
        setLoadingCourses(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // --- Fetch courses based on admin status or student year ---
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;
      if (!isAdmin && studentYear === null) return;

      try {
        const allYears = ["year1", "year3 (Biology)", "year3 (Geology)"];
        let yearsToFetch: string[] = [];

        if (isAdmin) {
          yearsToFetch = allYears;
        } else if (studentYear) {
          yearsToFetch =
            studentYear === "year3"
              ? ["year3 (Biology)", "year3 (Geology)"]
              : [studentYear];
        }

        const fetchedCourses: Course[] = [];
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
        console.error("Error fetching courses:", error);
      }
    };
    fetchCourses();
  }, [isAdmin, studentYear, user]);

  const handleCourseClick = (course: Course) => {
    router.push(`/courses/lectures?year=${course.year}&courseId=${course.id}`);
  };

  const groupedCourses = groupAndSortCourses(courses);

  return (
    <div className={styles.wrapper}>
      <h1>Available Courses</h1>
      {loadingCourses ? (
        <p>Loading courses...</p>
      ) : (
        <div className={styles.courseList}>
          {Object.keys(groupedCourses).length === 0 ? (
            <p>No courses available.</p>
          ) : (
            Object.keys(groupedCourses).map((year) => (
              <div key={year}>
                <h2 className={styles.yearTitle}>
                  {year.replace("year", "Year ")}
                </h2>
                {groupedCourses[year].map((course) => (
                  <div key={course.id} className={styles.courseCard}>
                    <h3>{course.title}</h3>
                    <p>{course.description}</p>
                    <p>
                      <strong>Year:</strong> {course.year}
                    </p>
                    <button onClick={() => handleCourseClick(course)}>
                      View Lectures
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
