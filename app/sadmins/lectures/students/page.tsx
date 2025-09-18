"use client";

import { useState, useEffect } from "react";

import { useSearchParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  DocumentData,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  IoPeople,
  IoCheckmarkCircle,
  IoTime,
  IoLockClosed,
} from "react-icons/io5";
import styles from "./page.module.css";
import { BiChevronLeft } from "react-icons/bi";
import { FaChalkboardTeacher } from "react-icons/fa";

interface StudentProgress {
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  unlocked: boolean;
  quizCompleted: boolean;
  earnedMarks?: number;
  totalPossibleMark?: number;
  attempts: number;
  lastAttempt?: string;
  studentYear?: string;
}

interface LectureInfo {
  title: string;
  description?: string;
  year: string;
  courseId: string;
  lectureId: string;
}

export default function StudentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [allYearStudents, setAllYearStudents] = useState<StudentProgress[]>([]);
  const [lectureInfo, setLectureInfo] = useState<LectureInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"unlocked" | "completed">("unlocked");

  const courseId = searchParams.get("courseId");
  const lectureId = searchParams.get("lectureId");

  const [isAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
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
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (courseId && lectureId) {
      fetchStudents();
    } else {
      setError("Missing required parameters: courseId or lectureId");
      setLoading(false);
    }
  }, [courseId, lectureId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);

      // Find lecture inside its year
      const yearsRef = collection(db, "years");
      const yearsSnap = await getDocs(yearsRef);

      let foundYearId: string | null = null;
      let lectureData: DocumentData | null = null;

      for (const yearDoc of yearsSnap.docs) {
        const yearId = yearDoc.id;
        const lectureRef = doc(
          db,
          "years",
          yearId,
          "courses",
          courseId!,
          "lectures",
          lectureId!
        );
        const lectureSnap = await getDoc(lectureRef);
        if (lectureSnap.exists()) {
          foundYearId = yearId;
          lectureData = lectureSnap.data();
          break;
        }
      }

      if (!foundYearId || !lectureData) {
        setError("Lecture not found in any year.");
        setLoading(false);
        return;
      }

      setLectureInfo({
        title: (lectureData.title as string) || "Untitled Lecture",
        description: lectureData.description as string | undefined,
        year: foundYearId,
        courseId: courseId!,
        lectureId: lectureId!,
      });

      // Get all students
      const studentsRef = collection(db, "students");
      const allStudentsSnap = await getDocs(studentsRef);

      if (allStudentsSnap.empty) {
        setError("No students found in database.");
        setLoading(false);
        return;
      }

      const allYearStudentsArray: StudentProgress[] = [];
      const studentsWithProgress: StudentProgress[] = [];

      for (const studentDoc of allStudentsSnap.docs) {
        const studentData = studentDoc.data();
        const studentId = studentDoc.id;

        const progressDocId = `${foundYearId}_${courseId}_${lectureId}`;
        const progressRef = doc(
          db,
          "students",
          studentId,
          "progress",
          progressDocId
        );
        const progressSnap = await getDoc(progressRef);

        const baseStudentInfo: StudentProgress = {
          studentId,
          studentName:
            (studentData.firstName && studentData.secondName
              ? `${studentData.firstName} ${studentData.secondName}`
              : studentData.displayName) || "Unknown Student",
          studentEmail: studentData.email || "No email",
          studentYear: studentData.year,
          unlocked: false,
          quizCompleted: false,
          attempts: 0,
        };

        if (progressSnap.exists()) {
          const progressData = progressSnap.data();
          const studentProgress: StudentProgress = {
            ...baseStudentInfo,
            unlocked: (progressData.unlocked as boolean) || false,
            quizCompleted: (progressData.quizCompleted as boolean) || false,
            earnedMarks: progressData.earnedMarks as number | undefined,
            totalPossibleMark: progressData.totalPossibleMarks as
              | number
              | undefined,
            attempts: (progressData.attempts as number) || 0,
            lastAttempt: progressData.lastAttempt as string | undefined,
          };

          allYearStudentsArray.push(studentProgress);
          if (progressData.unlocked) {
            studentsWithProgress.push(studentProgress);
          }
        } else {
          allYearStudentsArray.push(baseStudentInfo);
        }
      }

      studentsWithProgress.sort((a, b) =>
        (a.studentName || "").localeCompare(b.studentName || "")
      );
      allYearStudentsArray.sort((a, b) =>
        (a.studentName || "").localeCompare(b.studentName || "")
      );

      setStudents(studentsWithProgress);
      setAllYearStudents(allYearStudentsArray);
    } catch (err) {
      setError("Error fetching students");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredStudents = () => {
    switch (filter) {
      case "completed":
        return students.filter((s) => s.quizCompleted);
      case "unlocked":
      default:
        return students.filter((s) => s.unlocked);
    }
  };

  const getPercentage = (earned: number, totalPossibleMarks: number) => {
    if (!totalPossibleMarks) return 0;
    return Math.round((earned / totalPossibleMarks) * 100);
  };

  const getCompletionStats = () => {
    const totalEnrolled = students.length;
    const totalInYear = allYearStudents.length;
    const completed = students.filter((s) => s.quizCompleted).length;
    const averageScore =
      students
        .filter((s) => s.earnedMarks !== undefined && s.totalPossibleMark)
        .reduce(
          (sum, s) => sum + getPercentage(s.earnedMarks!, s.totalPossibleMark!),
          0
        ) / (completed || 1);

    return {
      totalEnrolled,
      totalInYear,
      completed,
      averageScore: Math.round(averageScore),
    };
  };

  if (loading) {
    return (
      <div className="wrapper">
        <p>Loading lectures...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrapper">
        <h2>Error Loading Students</h2>
        <p>{error}</p>
        <button onClick={() => router.push("/sadmins/lectures")}>
          Back to Lectures
        </button>
      </div>
    );
  }

  const stats = getCompletionStats();
  const filteredStudents = getFilteredStudents();
  const statsGrid = [
    {
      title: "Students Enrolled",
      value: stats.totalEnrolled,
      icon: IoPeople,
    },

    {
      title: "Completed the Quiz",
      value: stats.completed,
      icon: IoCheckmarkCircle,
    },

    {
      title: "Average Score",
      value: stats.averageScore + "%",
      icon: IoPeople,
    },
  ];

  return (
    <div className="wrapper">
      <button
        style={{ marginBottom: "1rem" }}
        onClick={() => router.push("/sadmins/lectures")}
      >
        <BiChevronLeft />
        Back to Lectures
      </button>

      <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <FaChalkboardTeacher /> {lectureInfo?.title}
      </h1>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {statsGrid.map((stat) => (
          <div key={stat.title} className={styles.statCard}>
            <stat.icon style={{ fontSize: "1.5rem" }} />
            <div>
              <h2>{stat.value}</h2>
              <div style={{ fontSize: "0.875rem" }}>{stat.title}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Students List */}
      <div className={styles.studentsCard}>
        {/* Filters */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          {[
            { key: "unlocked", label: "Enrolled", count: stats.totalEnrolled },
            { key: "completed", label: "Completed", count: stats.completed },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key as "unlocked" | "completed")}
              className={`${styles.filterButton} ${
                filter === key ? styles.active : styles.inactive
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        <table className={styles.studentsTable}>
          <thead>
            <tr>
              <th>Students ({filteredStudents.length})</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr
                key={student.studentId}
                className={styles.clickableRow}
                onClick={() =>
                  router.push(
                    `/sadmins/lectures/students/review?studentId=${
                      student.studentId
                    }&courseId=${courseId}&lectureId=${lectureId}&year=${
                      lectureInfo?.year ?? ""
                    }&studentName=${encodeURIComponent(
                      student.studentName || "Unknown"
                    )}`
                  )
                }
              >
                {/*Student name */}
                <td
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <div className={styles.studentAvatar}>
                    {student.studentName?.charAt(0).toUpperCase() || "S"}
                  </div>
                  <div>
                    <h3>{student.studentName || "Unknown Student"}</h3>
                    <small>Click to view quiz answers</small>
                  </div>
                </td>

                {/* Status */}
                <td style={{ fontSize: "2rem" }}>
                  {student.quizCompleted ? (
                    <IoCheckmarkCircle style={{ color: "var(--green)" }} />
                  ) : (
                    <IoTime
                      style={{
                        backgroundColor: "var(--red)",
                        color: "var(--dark)",
                        borderRadius: "var(--border-radius)",
                        padding: "2px",
                      }}
                    />
                  )}
                </td>

                {/* Attempts */}
                <td>
                  {student.attempts} attempt{student.attempts !== 1 ? "s" : ""}
                </td>

                {/* Score */}
                <td>
                  {student.quizCompleted &&
                    student.earnedMarks !== undefined &&
                    student.totalPossibleMark && (
                      <div className={styles.scoreSection}>
                        <div>
                          {student.earnedMarks}/{student.totalPossibleMark}
                        </div>
                        <div
                          className={`${styles.scorePercentage} ${
                            getPercentage(
                              student.earnedMarks,
                              student.totalPossibleMark
                            ) >= 70
                              ? styles.high
                              : getPercentage(
                                  student.earnedMarks,
                                  student.totalPossibleMark
                                ) >= 50
                              ? styles.medium
                              : styles.low
                          }`}
                        >
                          {getPercentage(
                            student.earnedMarks,
                            student.totalPossibleMark
                          )}
                          %
                        </div>
                      </div>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredStudents.length === 0 && (
          <div>
            <h3>No Students Found</h3>
            <p>
              {filter === "completed"
                ? "No students have completed the quiz yet."
                : "No students have enrolled in this lecture yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
