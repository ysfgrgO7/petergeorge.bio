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
  const [youtubeLink, setYoutubeLink] = useState("");

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

  const extractYouTubeId = (url: string): string | null => {
    const regex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleAddLecture = async () => {
    if (!selectedCourse || !lectureTitle || !youtubeLink) return;

    const youtubeId = extractYouTubeId(youtubeLink);
    if (!youtubeId) {
      alert("Invalid YouTube link");
      return;
    }

    const updatedLectures = [
      ...(selectedCourse.lectures || []),
      { title: lectureTitle, youtubeId },
    ];

    await updateDoc(doc(db, "courses", selectedCourse.id), {
      lectures: updatedLectures,
    });

    setLectureTitle("");
    setYoutubeLink("");
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

      <div className={styles.cards}>
        {courses.map((course) => (
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
                  placeholder="YouTube link"
                  value={youtubeLink}
                  onChange={(e) => setYoutubeLink(e.target.value)}
                />
                <button onClick={handleAddLecture}>Add Lecture</button>

                <ul className={styles.lectureList}>
                  {selectedCourse.lectures?.map(
                    (lecture: any, index: number) => (
                      <li key={index}>
                        {lecture.title} ({lecture.youtubeId})
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
