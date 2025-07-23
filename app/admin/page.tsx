"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  updateDoc,
  getDoc,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import styles from "./admin.module.css";

export default function AdminPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [newCourse, setNewCourse] = useState({ title: "", year: "Year 1" });
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [newLecture, setNewLecture] = useState({ title: "", videoUrl: "" });

  // Load courses
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "courses"), (snapshot) => {
      setCourses(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleAddCourse = async () => {
    if (!newCourse.title) return alert("Title is required");
    await addDoc(collection(db, "courses"), {
      ...newCourse,
      lectures: [],
      createdAt: new Date(),
    });
    setNewCourse({ title: "", year: "Year 1" });
  };

  const handleDeleteCourse = async (id: string) => {
    await deleteDoc(doc(db, "courses", id));
  };
  const handleAddLecture = async () => {
    if (!selectedCourse) return;

    const courseDocRef = doc(db, "courses", selectedCourse);
    const courseSnapshot = await getDoc(courseDocRef);
    const courseData = courseSnapshot.data();

    const lectures = courseData?.lectures || [];
    lectures.push({ ...newLecture, createdAt: new Date() });

    await updateDoc(courseDocRef, { lectures });
    setNewLecture({ title: "", videoUrl: "" });
  };

  return (
    <div className={styles.wrapper}>
      <h1>Admin Dashboard</h1>

      <div className={styles.section}>
        <h2>Create New Course</h2>
        <input
          type="text"
          placeholder="Course Title"
          value={newCourse.title}
          onChange={(e) =>
            setNewCourse((prev) => ({ ...prev, title: e.target.value }))
          }
        />
        <select
          value={newCourse.year}
          onChange={(e) =>
            setNewCourse((prev) => ({ ...prev, year: e.target.value }))
          }
        >
          <option value="Year 1">Year 1</option>
          <option value="Year 3">Year 3</option>
        </select>
        <button onClick={handleAddCourse}>Add Course</button>
      </div>

      <div className={styles.section}>
        <h2>Existing Courses</h2>
        {courses.map((course) => (
          <div key={course.id} className={styles.course}>
            <h3>
              {course.title} ({course.year})
            </h3>
            <button onClick={() => handleDeleteCourse(course.id)}>
              Delete
            </button>
            <button onClick={() => setSelectedCourse(course.id)}>
              Manage Lectures
            </button>
          </div>
        ))}
      </div>

      {selectedCourse && (
        <div className={styles.section}>
          <h2>Add Lecture to Selected Course</h2>
          <input
            type="text"
            placeholder="Lecture Title"
            value={newLecture.title}
            onChange={(e) =>
              setNewLecture((prev) => ({ ...prev, title: e.target.value }))
            }
          />
          <input
            type="text"
            placeholder="Odysee Video URL"
            value={newLecture.videoUrl}
            onChange={(e) =>
              setNewLecture((prev) => ({ ...prev, videoUrl: e.target.value }))
            }
          />
          <button onClick={handleAddLecture}>Add Lecture</button>
        </div>
      )}
    </div>
  );
}
