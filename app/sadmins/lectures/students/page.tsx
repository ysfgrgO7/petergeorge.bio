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
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  IoArrowBack,
  IoPeople,
  IoCheckmarkCircle,
  IoTime,
  IoTrophy,
  IoLockClosed,
} from "react-icons/io5";
import styles from "../sadmins.module.css";

interface StudentProgress {
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  unlocked: boolean;
  quizCompleted: boolean;
  earnedMarks?: number;
  total?: number;
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
            total: progressData.total as number | undefined,
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

  const getPercentage = (earned: number, total: number) => {
    if (!total) return 0;
    return Math.round((earned / total) * 100);
  };

  const getCompletionStats = () => {
    const totalEnrolled = students.length;
    const totalInYear = allYearStudents.length;
    const completed = students.filter((s) => s.quizCompleted).length;
    const averageScore =
      students
        .filter((s) => s.earnedMarks !== undefined && s.total)
        .reduce((sum, s) => sum + getPercentage(s.earnedMarks!, s.total!), 0) /
      (completed || 1);

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
        <div className={styles.maxWidth}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>Loading students...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrapper">
        <div className={styles.maxWidth}>
          <div className={styles.errorContainer}>
            <h2>Error Loading Students</h2>
            <p>{error}</p>
            <Link href="/sadmins/lectures" className={styles.backLink}>
              <IoArrowBack className={styles.backIcon} />
              Back to Lectures
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stats = getCompletionStats();
  const filteredStudents = getFilteredStudents();

  return (
    <div className="wrapper">
      <div className={styles.maxWidth}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div style={{ flex: 1 }}>
              <Link href="/sadmins/lectures" className={styles.backLink}>
                <IoArrowBack className={styles.backIcon} />
                Back to Lectures
              </Link>

              <div className={styles.lectureHeader}>
                <IoPeople className={styles.lectureIconLarge} />
                <div className={styles.lectureDetails}>
                  <h1>{lectureInfo?.title}</h1>
                  <p className={styles.lectureMeta}>
                    {lectureInfo?.year} • Course: {courseId}
                  </p>
                  {lectureInfo?.description && (
                    <p className={styles.lectureDesc}>
                      {lectureInfo.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={`${styles.statCard} ${styles.blue}`}>
              <IoPeople className={`${styles.statIcon} ${styles.blue}`} />
              <div>
                <div className={`${styles.statValue} ${styles.blue}`}>
                  {stats.totalEnrolled}
                </div>
                <div className={`${styles.statLabel} ${styles.blue}`}>
                  Students Enrolled
                </div>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.green}`}>
              <IoCheckmarkCircle
                className={`${styles.statIcon} ${styles.green}`}
              />
              <div>
                <div className={`${styles.statValue} ${styles.green}`}>
                  {stats.completed}
                </div>
                <div className={`${styles.statLabel} ${styles.green}`}>
                  Quiz Completed
                </div>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.purple}`}>
              <IoTrophy className={`${styles.statIcon} ${styles.purple}`} />
              <div>
                <div className={`${styles.statValue} ${styles.purple}`}>
                  {stats.averageScore}%
                </div>
                <div className={`${styles.statLabel} ${styles.purple}`}>
                  Average Score
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filterBar}>
          <div className={styles.filterButtons}>
            <button
              onClick={() => setFilter("unlocked")}
              className={
                filter === "unlocked"
                  ? `${styles.filterButton} ${styles.active}`
                  : `${styles.filterButton} ${styles.inactive}`
              }
            >
              Enrolled ({stats.totalEnrolled})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={
                filter === "completed"
                  ? `${styles.filterButton} ${styles.active}`
                  : `${styles.filterButton} ${styles.inactive}`
              }
            >
              Completed ({stats.completed})
            </button>
          </div>
        </div>

        {/* Students List */}
        <div className={styles.studentsCard}>
          <div className={styles.studentsHeader}>
            <h2 className={styles.studentsTitle}>
              Students ({filteredStudents.length})
            </h2>
          </div>

          <div className={styles.studentsList}>
            {filteredStudents.map((student) => (
              <div key={student.studentId} className={styles.studentRow}>
                <div className={styles.studentContent}>
                  <div className={styles.studentInfo}>
                    <div className={styles.studentAvatar}>
                      {student.studentName?.charAt(0).toUpperCase() || "S"}
                    </div>
                    <div>
                      <h3 className={styles.studentName}>
                        {student.studentName || "Unknown Student"}
                      </h3>
                      <p className={styles.studentEmail}>
                        {student.studentEmail}
                      </p>
                    </div>
                  </div>

                  <div className={styles.studentStats}>
                    {/* Quiz Status */}
                    <div className={styles.statusSection}>
                      {!student.unlocked ? (
                        <div className={styles.statusLocked}>
                          <IoLockClosed className={styles.statusIcon} />
                          <span>Not Unlocked</span>
                        </div>
                      ) : student.quizCompleted ? (
                        <div className={styles.statusCompleted}>
                          <IoCheckmarkCircle className={styles.statusIcon} />
                          <span>Completed</span>
                        </div>
                      ) : (
                        <div className={styles.statusInProgress}>
                          <IoTime className={styles.statusIcon} />
                          <span>In Progress</span>
                        </div>
                      )}
                      <div className={styles.attemptsText}>
                        {student.attempts} attempt
                        {student.attempts !== 1 ? "s" : ""}
                      </div>
                    </div>

                    {/* Score */}
                    {student.quizCompleted &&
                      student.earnedMarks !== undefined &&
                      student.total && (
                        <div className={styles.scoreSection}>
                          <div className={styles.scoreValue}>
                            {student.earnedMarks}/{student.total}
                          </div>
                          <div
                            className={`${styles.scorePercentage} ${
                              getPercentage(
                                student.earnedMarks,
                                student.total
                              ) >= 70
                                ? styles.high
                                : getPercentage(
                                    student.earnedMarks,
                                    student.total
                                  ) >= 50
                                ? styles.medium
                                : styles.low
                            }`}
                          >
                            {getPercentage(student.earnedMarks, student.total)}%
                          </div>
                        </div>
                      )}

                    {/* Status Badge */}
                    <div>
                      {student.unlocked ? (
                        <span className={styles.statusBadge}>
                          <IoCheckmarkCircle className={styles.badgeIcon} />
                          Unlocked
                        </span>
                      ) : (
                        <span
                          className={`${styles.statusBadge} ${styles.locked}`}
                        >
                          <IoLockClosed className={styles.badgeIcon} />
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div className={styles.emptyState}>
              <IoPeople className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>No Students Found</h3>
              <p className={styles.emptyDescription}>
                {filter === "completed"
                  ? "No students have completed the quiz yet."
                  : "No students have enrolled in this lecture yet."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
