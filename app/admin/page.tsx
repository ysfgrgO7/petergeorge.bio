"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  DocumentData,
  query,
  orderBy,
  setDoc, // Added setDoc for initializing year documents if needed
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import styles from "./admin.module.css";

// Re-using the MessageModalProps interface and MessageModal component
interface MessageModalProps {
  message: string;
  onClose: () => void;
}

const MessageModal: React.FC<MessageModalProps> = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
        <p className="text-lg font-semibold mb-4">{message}</p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          OK
        </button>
      </div>
    </div>
  );
};

// Define an interface for the Lecture structure in the subcollection
interface Lecture extends DocumentData {
  id: string; // Document ID for the lecture in the subcollection
  title: string;
  odyseeName: string;
  odyseeId: string;
  order: number; // To maintain the display order of lectures
}

// Define an interface for the Course structure (lectures array removed, 'year' removed as it's now in the path)
interface Course extends DocumentData {
  id: string; // Firestore document ID
  title: string;
  description: string;
  thumbnailUrl?: string; // Optional property
  // 'year' is no longer a field in the Course document, it's part of the path
}

export default function AdminDashboard() {
  const [courses, setCourses] = useState<Course[]>([]); // Courses for the activeYearTab
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // 'year' state for creating new courses, will determine which year's subcollection to add to
  const [yearForNewCourse, setYearForNewCourse] = useState<"year1" | "year3">(
    "year1"
  );
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [openLecturePanels, setOpenLecturePanels] = useState<Set<string>>(
    new Set()
  );

  const [lectureTitle, setLectureTitle] = useState("");
  const [odyseeLink, setOdyseeLink] = useState("");
  const [activeYearTab, setActiveYearTab] = useState<"year1" | "year3">(
    "year1"
  );

  const [courseLectures, setCourseLectures] = useState<
    Record<string, Lecture[]>
  >({}); // Store lectures per courseId
  const [loadingLectures, setLoadingLectures] = useState<Set<string>>(
    new Set()
  ); // Loading state per course for lectures

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const toggleLecturePanel = async (courseId: string) => {
    setOpenLecturePanels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
        // Fetch lectures when panel is opened, for the currently active year tab
        if (!courseLectures[courseId]) {
          fetchLecturesForCourse(activeYearTab, courseId);
        }
      }
      return newSet;
    });
  };

  // Function to fetch courses for a specific year
  const fetchCourses = async (yearToFetch: "year1" | "year3") => {
    try {
      // Ensure the year document exists (e.g., 'years/year1')
      // This is a common pattern to ensure parent documents exist for subcollections
      await setDoc(
        doc(db, "years", yearToFetch),
        { exists: true },
        { merge: true }
      );

      const coursesRef = collection(db, "years", yearToFetch, "courses");
      const snapshot = await getDocs(coursesRef);
      const fetched: Course[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Course[];
      setCourses(fetched); // Set courses for the current active tab
    } catch (error) {
      console.error(`Error fetching courses for ${yearToFetch}:`, error);
      setModalMessage(`Failed to load courses for ${yearToFetch}.`);
      setShowModal(true);
    }
  };

  // Function to fetch lectures for a specific course within a specific year
  const fetchLecturesForCourse = async (
    courseYear: "year1" | "year3",
    courseId: string
  ) => {
    setLoadingLectures((prev) => new Set(prev).add(courseId));
    try {
      const lecturesRef = collection(
        db,
        `years/${courseYear}/courses/${courseId}/lectures`
      );
      const q = query(lecturesRef, orderBy("order"));
      const snapshot = await getDocs(q);
      const fetchedLectures: Lecture[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Lecture[];
      setCourseLectures((prev) => ({ ...prev, [courseId]: fetchedLectures }));
    } catch (error) {
      console.error(
        `Error fetching lectures for course ${courseId} in ${courseYear}:`,
        error
      );
      setModalMessage(`Failed to load lectures for course: ${courseId}.`);
      setShowModal(true);
    } finally {
      setLoadingLectures((prev) => {
        const newSet = new Set(prev);
        newSet.delete(courseId);
        return newSet;
      });
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) {
      setModalMessage("Course title and description cannot be empty.");
      setShowModal(true);
      return;
    }
    try {
      // Add course to the specific year's subcollection
      await addDoc(collection(db, "years", yearForNewCourse, "courses"), {
        title,
        description,
        thumbnailUrl: "",
      });
      setTitle("");
      setDescription("");
      fetchCourses(activeYearTab); // Re-fetch courses for the currently active tab
      setModalMessage("Course created successfully!");
      setShowModal(true);
    } catch (error: unknown) {
      console.error("Error creating course:", error);
      setModalMessage("Failed to create course: " + (error as Error).message);
      setShowModal(true);
    }
  };

  // handleDelete now needs the year of the course
  const handleDelete = async (
    courseYear: "year1" | "year3",
    courseId: string
  ) => {
    try {
      await deleteDoc(doc(db, "years", courseYear, "courses", courseId));
      if (selectedCourse?.id === courseId) setSelectedCourse(null);
      fetchCourses(activeYearTab); // Re-fetch courses for the current active tab
      setModalMessage("Course deleted successfully!");
      setShowModal(true);
    } catch (error: unknown) {
      console.error("Error deleting course:", error);
      setModalMessage("Failed to delete course: " + (error as Error).message);
      setShowModal(true);
    }
  };

  const extractOdyseeInfo = (
    url: string
  ): { name: string; id: string } | null => {
    const regex = /odysee\.com\/[^/]+\/([^:]+):([a-zA-Z0-9]+)/;
    const match = url.match(regex);
    if (!match) return null;
    return { name: match[1], id: match[2] };
  };

  const handleAddLecture = async (courseId: string) => {
    if (!lectureTitle.trim() || !odyseeLink.trim()) {
      setModalMessage("Lecture title and Odysee link cannot be empty.");
      setShowModal(true);
      return;
    }

    const info = extractOdyseeInfo(odyseeLink);
    if (!info) {
      setModalMessage(
        "Invalid Odysee link format. Please use a link like 'https://odysee.com/@channel/video-name:id'."
      );
      setShowModal(true);
      return;
    }

    try {
      // Add lecture to the specific course's lectures subcollection within its year
      const lecturesRef = collection(
        db,
        `years/${activeYearTab}/courses/${courseId}/lectures`
      );
      const existingLectures = courseLectures[courseId] || [];
      const newOrder =
        existingLectures.length > 0
          ? Math.max(...existingLectures.map((l) => l.order)) + 1
          : 0;

      await addDoc(lecturesRef, {
        title: lectureTitle,
        odyseeName: info.name,
        odyseeId: info.id,
        order: newOrder,
      });

      setLectureTitle("");
      setOdyseeLink("");
      fetchLecturesForCourse(activeYearTab, courseId); // Re-fetch lectures for the specific course
      setModalMessage("Lecture added successfully!");
      setShowModal(true);
    } catch (error: unknown) {
      console.error("Error adding lecture:", error);
      setModalMessage("Failed to add lecture: " + (error as Error).message);
      setShowModal(true);
    }
  };

  // handleDeleteLecture now needs the year of the course
  const handleDeleteLecture = async (courseId: string, lectureId: string) => {
    try {
      // Delete lecture from the specific course's lectures subcollection within its year
      await deleteDoc(
        doc(
          db,
          `years/${activeYearTab}/courses/${courseId}/lectures`,
          lectureId
        )
      );
      fetchLecturesForCourse(activeYearTab, courseId); // Re-fetch lectures for the specific course
      setModalMessage("Lecture deleted successfully!");
      setShowModal(true);
    } catch (error: unknown) {
      console.error("Error deleting lecture:", error);
      setModalMessage("Failed to delete lecture: " + (error as Error).message);
      setShowModal(true);
    }
  };

  useEffect(() => {
    // Fetch courses for the initially active year tab
    fetchCourses(activeYearTab);
  }, [activeYearTab]); // Re-fetch courses whenever the active year tab changes

  // This useEffect ensures that the 'yearForNewCourse' state for new course creation
  // always matches the currently active tab.
  useEffect(() => {
    setYearForNewCourse(activeYearTab);
  }, [activeYearTab]);

  return (
    <div className={styles.wrapper}>
      <h1>Admin Dashboard</h1>
      <hr
        style={{
          margin: "1rem 0",
          border: "none",
          borderTop: "3px solid var(--black)",
          borderRadius: "4px",
        }}
      />

      <h1>Create Course</h1>
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
        {/* Dropdown for selecting year when creating a new course */}
        <select
          value={yearForNewCourse}
          onChange={(e) =>
            setYearForNewCourse(e.target.value as "year1" | "year3")
          }
        >
          <option value="year1">Year 1</option>
          <option value="year3">Year 3</option>
        </select>
        <button onClick={handleCreate}>Create Course</button>
      </div>

      <hr
        style={{
          margin: "1rem 0",
          border: "none",
          borderTop: "3px solid var(--black)",
          borderRadius: "4px",
        }}
      />

      <h1>Existing Courses</h1>
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
        {/* Courses are now directly filtered by the fetchCourses function based on activeYearTab */}
        {courses.map((course) => (
          <div key={course.id} className={styles.card}>
            <h2>{course.title}</h2>
            <p>{course.description}</p>
            <p>
              {/* Year is no longer a field in the course document, but we can display the active tab's year */}
              <strong>Year:</strong> {activeYearTab.toUpperCase()}
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => handleDelete(activeYearTab, course.id)}>
                Delete
              </button>
              <button onClick={() => toggleLecturePanel(course.id)}>
                {openLecturePanels.has(course.id)
                  ? "Hide Lectures"
                  : "Manage Lectures"}
              </button>
            </div>

            {openLecturePanels.has(course.id) && (
              <div className={styles.lecturePanel}>
                <h3>Add New Lecture</h3>
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
                <button onClick={() => handleAddLecture(course.id)}>
                  Add Lecture
                </button>

                <h3 style={{ marginTop: "1.5rem" }}>Existing Lectures</h3>
                {loadingLectures.has(course.id) ? (
                  <p>Loading lectures...</p>
                ) : courseLectures[course.id] &&
                  courseLectures[course.id].length > 0 ? (
                  <ul className={styles.lectureList}>
                    {courseLectures[course.id].map((lecture: Lecture) => (
                      <li key={lecture.id}>
                        {" "}
                        {/* Use lecture.id for key */}
                        {lecture.title} ({lecture.odyseeId}) (Order:{" "}
                        {lecture.order})
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={
                              () => handleDeleteLecture(course.id, lecture.id) // Pass courseId and lecture.id
                            }
                          >
                            ❌
                          </button>
                          <button
                            onClick={
                              () =>
                                (window.location.href = `/admin/quiz?year=${activeYearTab}&courseId=${course.id}&lectureId=${lecture.id}`) // Pass year, courseId, lectureId
                            }
                          >
                            ➕ Quiz
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No lectures added yet for this course.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <MessageModal
          message={modalMessage}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
