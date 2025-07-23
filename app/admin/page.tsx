"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import styles from "./admin.module.css";

export default function AdminDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState("year1");
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [lectureTitle, setLectureTitle] = useState("");
  const [odyseeLink, setOdyseeLink] = useState("");
  const [activeYearTab, setActiveYearTab] = useState<"year1" | "year3">(
    "year1"
  );

  const fetchCourses = async () => {
    const snapshot = await getDocs(collection(db, "courses"));
    const fetched = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setCourses(fetched);
  };

  const handleCreate = async () => {
    if (!title || !description) return;
    await addDoc(collection(db, "courses"), {
      title,
      description,
      year,
      thumbnailUrl: "", // optional
      lectures: [],
    });
    setTitle("");
    setDescription("");
    fetchCourses();
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "courses", id));
    fetchCourses();
  };

  const extractOdyseeInfo = (
    url: string
  ): { name: string; id: string } | null => {
    const regex = /odysee\.com\/[^/]+\/([^:]+):([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    if (!match) return null;
    return { name: match[1], id: match[2] };
  };

  const handleAddLecture = async () => {
    if (!selectedCourse || !lectureTitle || !odyseeLink) return;

    const info = extractOdyseeInfo(odyseeLink);
    if (!info) {
      alert("Invalid Odysee link");
      return;
    }

    const updatedLectures = [
      ...(selectedCourse.lectures || []),
      {
        title: lectureTitle,
        odyseeName: info.name,
        odyseeId: info.id,
      },
    ];

    await updateDoc(doc(db, "courses", selectedCourse.id), {
      lectures: updatedLectures,
    });

    setLectureTitle("");
    setOdyseeLink("");
    fetchCourses();
  };

  const handleDeleteLecture = async (lectureIndex: number) => {
    if (!selectedCourse) return;

    const updatedLectures = [...(selectedCourse.lectures || [])];
    updatedLectures.splice(lectureIndex, 1);

    await updateDoc(doc(db, "courses", selectedCourse.id), {
      lectures: updatedLectures,
    });

    fetchCourses();
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  return (
    <div className={styles.wrapper}>
      <h1>Admin Dashboard - Manage Courses</h1>

      <div className={styles.form}>
        <input
          type="text"
          placeholder="Course title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="year1">Year 1</option>
          <option value="year3">Year 3</option>
        </select>
        <button onClick={handleCreate}>Create Course</button>
      </div>

      <div className={styles.tabs}>
        <button
          className={activeYearTab === "year1" ? styles.activeTab : ""}
          onClick={() => setActiveYearTab("year1")}
        >
          Year 1
        </button>
        <button
          className={activeYearTab === "year3" ? styles.activeTab : ""}
          onClick={() => setActiveYearTab("year3")}
        >
          Year 3
        </button>
      </div>

      <div className={styles.cards}>
        {courses
          .filter((course) => course.year === activeYearTab)
          .map((course) => (
            <div key={course.id} className={styles.card}>
              <h2>{course.title}</h2>
              <p>{course.description}</p>
              <p>
                <strong>Year:</strong> {course.year.toUpperCase()}
              </p>
              <button onClick={() => handleDelete(course.id)}>Delete</button>
              <button onClick={() => setSelectedCourse(course)}>
                Manage Lectures
              </button>
              {selectedCourse && (
                <div className={styles.lecturePanel}>
                  <h2>Manage Lectures for {selectedCourse.title}</h2>
                  <input
                    type="text"
                    placeholder="Lecture title"
                    value={lectureTitle}
                    onChange={(e) => setLectureTitle(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Odysee link"
                    value={odyseeLink}
                    onChange={(e) => setOdyseeLink(e.target.value)}
                  />
                  <button onClick={handleAddLecture}>Add Lecture</button>
                  <ul className={styles.lectureList}>
                    {selectedCourse.lectures?.map(
                      (lecture: any, index: number) => (
                        <li key={index}>
                          {lecture.title} ({lecture.odyseeId})
                          <button onClick={() => handleDeleteLecture(index)}>
                            ❌
                          </button>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
