"use client";

import React, { useState, useEffect } from "react";
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
import styles from "./progress.module.css";
import { useTheme } from "@/app/components/ThemeProvider";

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

export default function ProgressPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [progressGroups, setProgressGroups] = useState<
    Record<string, ProgressItem[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string>("");
  const { isDef, isHalloween, isXmas, isRamadan } = useTheme();
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
        // 🔹 Fetch student info
        const userSnap = await getDoc(doc(db, "students", studentId));
        if (userSnap.exists()) {
          setStudentInfo({
            ...(userSnap.data() as UserProfile),
            uid: user.uid,
          });
        }

        // 🔹 Fetch all progress docs
        const progressSnap = await getDocs(
          collection(db, "students", studentId, "progress"),
        );

        if (progressSnap.empty) {
          setProgressGroups({});
          setLoading(false);
          return;
        }

        // Extract all needed IDs
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

        // 🔹 Fetch all courses in bulk
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

        // 🔹 Fetch all lectures in bulk
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

        // 🔹 Build items
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

        // 🔹 filter hidden, sort by order, and group by year+course
        const grouped: Record<string, ProgressItem[]> = {};
        items
          .filter((i) => !i.isHidden)
          .sort((a, b) => a.order - b.order)
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

  if (loading) {
    return (
      <div className={styles.center}>
        <p>Loading your data...</p>
      </div>
    );
  }
  const infoItems = studentInfo
    ? [
        {
          label: "Full Name",
          value: `${studentInfo.firstName} ${studentInfo.secondName} ${studentInfo.thirdName} ${studentInfo.forthName}`,
        },
        { label: "Student Code", value: studentInfo.studentCode },
        { label: "Email", value: studentInfo.email },
        { label: "Gender", value: studentInfo.gender },
        { label: "Year", value: studentInfo.year.toUpperCase() },
        { label: "School", value: studentInfo.school },
        { label: "Student Phone", value: studentInfo.studentPhone },
        { label: "Fathers Phone", value: studentInfo.fatherPhone },
        { label: "Mothers Phone", value: studentInfo.motherPhone },
        {
          label: "Registration Date",
          value: new Date(studentInfo.createdAt).toLocaleDateString(),
        },
        studentInfo.devices?.length
          ? {
              label: "Devices",
              value: `${studentInfo.devices.length} device(s)`,
            }
          : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="wrapper">
      {studentInfo && (
        <div className={styles.section}>
          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            {isHalloween && <h1>🎃</h1>}
            {isXmas && <h1>🎄</h1>}
            {isRamadan && <h1>🌙</h1>}
            <h1>Personal Information</h1>
          </div>
          <div className={styles.infoGrid}>
            {infoItems.map((item, idx) =>
              item ? (
                <div key={idx} className={styles.infoItem}>
                  <div style={{ display: "flex" }}>
                    {isHalloween && <p>🎃</p>}
                    {isXmas && <p>🎄</p>}
                    {isRamadan && <p>🌙</p>}
                    <strong>{item.label}:</strong>
                  </div>
                  <span>{item.value}</span>
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
        {isHalloween && <h1>🎃</h1>}
        {isXmas && <h1>🎄</h1>}
        {isRamadan && <h1>🌙</h1>}
        <h1 className={styles.heading}>My Quiz Progress</h1>
      </div>

      {error ? (
        <p className={styles.error}>{error}</p>
      ) : Object.keys(progressGroups).length ? (
        Object.entries(progressGroups).map(([groupKey, items]) => (
          <div key={groupKey} className={styles.section}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Lecture</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={styles.row}>
                    <td>{item.lectureTitle}</td>
                    <td className={styles.score}>
                      {item.quiz
                        ? `${item.quiz.earnedMarks} / ${item.quiz.totalPossibleMarks}`
                        : "No Quiz"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <p className={styles.empty}>
          You haven’t completed any quizzes yet. Keep learning! ✨
        </p>
      )}
    </div>
  );
}
