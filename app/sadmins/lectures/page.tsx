"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { IoPeople } from "react-icons/io5";
import { FaChevronCircleRight, FaChevronCircleDown } from "react-icons/fa";
import { RiAdminFill } from "react-icons/ri";
import styles from "./page.module.css";
import Loading from "@/app/components/Loading";

interface Lecture {
  id: string;
  title: string;
  description?: string;
  order?: number; // Change from createdAt to order
  year: string;
  courseId: string;
  courseName?: string;
}

interface CourseData {
  id: string;
  name: string;
  lectures: Lecture[];
}

interface YearData {
  year: string;
  courses: CourseData[];
}

export default function SAdminsPage() {
  const router = useRouter();
  const [yearsData, setYearsData] = useState<YearData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(
    new Set(),
  );

  const years = ["year1", "year3 (Biology)", "year3 (Geology)"];

  const [isAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.email) {
          const adminDocRef = doc(db, "superAdmins", user.email);
          const adminDocSnap = await getDoc(adminDocRef);

          if (adminDocSnap.exists()) {
            setIsSuperAdmin(true);
          } else {
            router.push("/");
          }
        } else {
          router.push("/");
        }
      } else {
        router.push("/");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    fetchAllLectures();
  }, []);

  const fetchAllLectures = async () => {
    try {
      const allYearsData: YearData[] = [];

      for (const year of years) {
        const coursesRef = collection(db, "years", year, "courses");
        const coursesSnap = await getDocs(coursesRef);
        const coursesData: CourseData[] = [];

        for (const courseDoc of coursesSnap.docs) {
          const courseId = courseDoc.id;
          const courseData = courseDoc.data();
          const lecturesRef = collection(
            db,
            "years",
            year,
            "courses",
            courseId,
            "lectures",
          );
          const lecturesQuery = query(lecturesRef, orderBy("order", "asc"));
          const lecturesSnap = await getDocs(lecturesQuery);

          const lectures: Lecture[] = lecturesSnap.docs.map((doc) => ({
            id: doc.id,
            title: doc.data().title || "Untitled Lecture",
            description: doc.data().description,
            order: doc.data().order, // Use order
            year,
            courseId,
            courseName: courseData.title || courseId,
          }));

          coursesData.push({
            id: courseId,
            name: courseData.title || courseId,
            lectures,
          });
        }
        // Sort courses alphabetically by name
        coursesData.sort((a, b) => a.name.localeCompare(b.name));

        allYearsData.push({
          year,
          courses: coursesData,
        });
      }

      setYearsData(allYearsData);
    } catch (error) {
      console.error("Error fetching lectures:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => {
      const newSet = new Set(prev);
      newSet.has(year) ? newSet.delete(year) : newSet.add(year);
      return newSet;
    });
  };

  const toggleCourse = (courseKey: string) => {
    setExpandedCourses((prev) => {
      const newSet = new Set(prev);
      newSet.has(courseKey) ? newSet.delete(courseKey) : newSet.add(courseKey);
      return newSet;
    });
  };

  const getTotalLecturesCount = () => {
    return yearsData.reduce(
      (total, year) =>
        total +
        year.courses.reduce(
          (courseTotal, course) => courseTotal + course.lectures.length,
          0,
        ),
      0,
    );
  };

  if (loading) {
    return (
      <div className="wrapper">
        <Loading text="Loading lectures..." />
      </div>
    );
  }

  return (
    <div className="wrapper">
      <div className={styles.title}>
        <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <RiAdminFill /> Super Admin - Lectures Management
        </h1>
        <div className={styles.stats}>
          Total Lectures: {getTotalLecturesCount()}
        </div>
      </div>
      <p>
        <strong>Manage all lectures for enrolled students</strong>
      </p>
      <hr />
      <div>
        {yearsData.map((yearData) => (
          <div key={yearData.year}>
            <button
              className={styles.card}
              onClick={() => toggleYear(yearData.year)}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {expandedYears.has(yearData.year) ? (
                    <FaChevronCircleDown />
                  ) : (
                    <FaChevronCircleRight />
                  )}
                  <h2>{yearData.year}</h2>
                </div>
                <div className={styles.cardStats}>
                  <span>{yearData.courses.length} courses</span>
                  <span>
                    {yearData.courses.reduce(
                      (total, course) => total + course.lectures.length,
                      0,
                    )}{" "}
                    lectures
                  </span>
                </div>
              </div>
            </button>
            {expandedYears.has(yearData.year) && (
              <div>
                {yearData.courses.map((course) => {
                  const courseKey = `${yearData.year}-${course.id}`;
                  return (
                    <div
                      key={courseKey}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        marginBottom: "1rem",
                      }}
                    >
                      <button
                        className={styles.card}
                        onClick={() => toggleCourse(courseKey)}
                        style={{ width: "98%" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            {expandedCourses.has(courseKey) ? (
                              <FaChevronCircleDown />
                            ) : (
                              <FaChevronCircleRight />
                            )}
                            <h3>{course.name}</h3>
                          </div>
                          <span>{course.lectures.length} lectures</span>
                        </div>
                      </button>
                      {expandedCourses.has(courseKey) && (
                        <div
                          style={{
                            width: "96%",
                            marginTop: "0.5rem",
                            marginBottom: "1rem",
                          }}
                        >
                          {course.lectures.length > 0 ? (
                            course.lectures.map((lecture) => (
                              <Link
                                key={lecture.id}
                                href={`/sadmins/lectures/students?year=${encodeURIComponent(
                                  yearData.year,
                                )}&courseId=${course.id}&lectureId=${
                                  lecture.id
                                }`}
                              >
                                <div
                                  className={styles.card}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                >
                                  <div>
                                    <h4>{lecture.title}</h4>
                                    {lecture.description && (
                                      <p>{lecture.description}</p>
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                    }}
                                  >
                                    <IoPeople />
                                    <span>View Students</span>
                                    <FaChevronCircleRight />
                                  </div>
                                </div>
                              </Link>
                            ))
                          ) : (
                            <div>
                              <p>No lectures in this course yet</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      {yearsData.length === 0 && (
        <div>
          <IoPeople />
          <h3>No Lectures Found</h3>
          <p>No lectures have been created yet in any of the years.</p>
        </div>
      )}
    </div>
  );
}
