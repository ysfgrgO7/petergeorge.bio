"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  DocumentData,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaGraduationCap,
  FaClipboardList,
} from "react-icons/fa";
import styles from "./dashboard.module.css";
import { useTheme } from "@/app/components/ThemeProvider";
import { DashboardCharts } from "./charts";

// --- Interfaces ---
interface QuizData {
  earnedMarks: number;
  totalPossibleMarks: number;
}

interface UserProfile {
  firstName: string;
  secondName: string;
  thirdName: string;
  forthName: string;
  email: string;
  studentPhone: string;
  fatherPhone: string;
  motherPhone: string;
  year: string;
  gender: string;
  school: string;
  studentCode: string;
  createdAt: string;
  devices?: string[];
  uid: string;
}

interface ProgressItem {
  id: string;
  year: string;
  courseTitle: string;
  lectureTitle: string;
  quiz: QuizData | null;
  isHidden: boolean;
  order: number;
}

export default function StudentDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [progressGroups, setProgressGroups] = useState<
    Record<string, ProgressItem[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string>("");
  const { isHalloween, isXmas, isRamadan } = useTheme();

  const auth = getAuth();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(true);
      setError("");

      if (!user || !user.uid) {
        router.push("/");
        return;
      }

      const studentId = user.uid.trim();

      try {
        // 1. Fetch Student Profile
        const userSnap = await getDoc(doc(db, "students", studentId));
        if (userSnap.exists()) {
          setStudentInfo({
            ...(userSnap.data() as UserProfile),
            uid: user.uid,
          });
        }

        // 2. Fetch Progress Data
        const progressSnap = await getDocs(
          collection(db, "students", studentId, "progress"),
        );

        if (progressSnap.empty) {
          setProgressGroups({});
          setLoading(false);
          return;
        }

        const parsed = progressSnap.docs.map((d) => {
          const [year, courseId, lectureId] = d.id.split("_");
          return {
            id: d.id,
            year,
            courseId,
            lectureId,
            quiz: d.data() as QuizData,
          };
        });

        const uniqueYears = [...new Set(parsed.map((p) => p.year))];

        // 3. Fetch Courses
        const courseDocs = await Promise.all(
          uniqueYears.map((y) =>
            getDocs(collection(db, "years", y, "courses")),
          ),
        );

        const courseMap: Record<string, { year: string; title: string }> = {};
        courseDocs.forEach((snap, idx) => {
          const yearKey = uniqueYears[idx];
          snap.forEach((c) => {
            const data = c.data() as DocumentData;
            courseMap[`${yearKey}_${c.id}`] = {
              year: yearKey,
              title: data.title || c.id,
            };
          });
        });

        // 4. Fetch Lectures
        const lectureDocs = await Promise.all(
          parsed.map((p) =>
            getDoc(
              doc(
                db,
                "years",
                p.year,
                "courses",
                p.courseId,
                "lectures",
                p.lectureId,
              ),
            ),
          ),
        );

        const lectureMap: Record<
          string,
          { title: string; isHidden: boolean; order: number }
        > = {};
        lectureDocs.forEach((snap) => {
          if (snap.exists()) {
            const data = snap.data() as DocumentData;
            lectureMap[snap.id] = {
              title: data.title || snap.id,
              isHidden: !!data.isHidden,
              order: typeof data.order === "number" ? data.order : 9999,
            };
          }
        });

        // 5. Build Final Items
        const items: ProgressItem[] = parsed.map((p) => {
          const courseKey = `${p.year}_${p.courseId}`;
          const course = courseMap[courseKey];
          const lectureData = lectureMap[p.lectureId] || {
            title: p.lectureId,
            isHidden: false,
            order: 9999,
          };
          return {
            id: p.id,
            year: course?.year || p.year,
            quiz: p.quiz,
            courseTitle: course?.title || p.courseId,
            lectureTitle: lectureData.title,
            isHidden: lectureData.isHidden,
            order: lectureData.order,
          };
        });

        // 6. Group and Sort
        const grouped: Record<string, ProgressItem[]> = {};
        items
          .filter(
            (i) =>
              !i.isHidden &&
              i.quiz !== null &&
              typeof i.quiz.earnedMarks === "number",
          ) // Strictly filter out lectures without valid quizzes
          .sort((a, b) => {
            // Sort by Year (Desc), Course Title (Asc), then Lecture Order (Asc)
            if (a.year !== b.year) return b.year.localeCompare(a.year);
            if (a.courseTitle !== b.courseTitle)
              return a.courseTitle.localeCompare(b.courseTitle);
            return a.order - b.order;
          })
          .forEach((item) => {
            const key = `${item.year} - ${item.courseTitle}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(item);
          });

        setProgressGroups(grouped);
      } catch (err) {
        console.error("Error fetching progress:", err);
        setError("Failed to load your progress.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  if (loading)
    return (
      <div className={styles.center}>
        <p>Loading your dashboard...</p>
      </div>
    );

  return (
    <div className="wrapper">
      <div
        className={styles.titleWithIcon}
        style={{
          marginBottom: "var(--spacing-lg)",
          borderBottom: "2px solid var(--blue)",
        }}
      >
        {isHalloween && <span>🎃</span>}
        {isXmas && <span>🎄</span>}
        {isRamadan && <span>🌙</span>}
        <h1>My Dashboard</h1>
      </div>

      {/* Student Info */}
      <div className={styles.infoCard}>
        <div>
          <div className={styles.titleWithIcon}>
            <FaUser color="var(--blue)" />
            <h3>Student Profile</h3>
          </div>
          {studentInfo && (
            <div className={styles.infoList}>
              <div className={styles.infoEntry}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <FaUser color="var(--light)" size={14} />
                  <strong>Full Name:</strong>
                </div>
                <span>{`${studentInfo.firstName} ${studentInfo.secondName} ${studentInfo.forthName}`}</span>
              </div>
              <div className={styles.infoEntry}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <FaGraduationCap color="var(--light)" size={14} />
                  <strong>Year:</strong>
                </div>
                <span>{studentInfo.year.toUpperCase()}</span>
              </div>
              <div className={styles.infoEntry}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <FaEnvelope color="var(--light)" size={14} />
                  <strong>Email:</strong>
                </div>
                <span>{studentInfo.email}</span>
              </div>
              <div className={styles.infoEntry}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <FaPhone color="var(--light)" size={14} />
                  <strong>Phone:</strong>
                </div>
                <span>{studentInfo.studentPhone}</span>
              </div>
            </div>
          )}
        </div>
        {studentInfo && (
          <div className={styles.qrWrapper}>
            <QRCodeSVG value={studentInfo.studentCode} size={200} level="H" />
            <small>{studentInfo.studentCode}</small>
          </div>
        )}
      </div>

      <DashboardCharts progressGroups={progressGroups} />

      {/* Detailed Progress Table */}
      <div className={styles.tableSection}>
        <div className={styles.titleWithIcon} style={{ marginBottom: "20px" }}>
          <FaClipboardList color="var(--blue)" />
          <h2 className={styles.heading} style={{ margin: 0 }}>
            Detailed Quiz Logs
          </h2>
        </div>
        {error ? (
          <p className={styles.error}>{error}</p>
        ) : Object.keys(progressGroups).length ? (
          Object.entries(progressGroups).map(([groupKey, items]) => (
            <div key={groupKey} className={styles.courseGroup}>
              <h4 className={styles.courseTitle}>{groupKey}</h4>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Lecture Name</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      return (
                        <tr key={item.id} className={styles.row}>
                          <td>{item.lectureTitle}</td>
                          <td className={styles.score}>
                            {item.quiz
                              ? `${item.quiz.earnedMarks} / ${item.quiz.totalPossibleMarks}`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <p className={styles.empty}>
            Start your first lecture to see progress! ✨
          </p>
        )}
      </div>
    </div>
  );
}
