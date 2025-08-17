"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  DocumentData,
  query,
  orderBy,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import styles from "./admin.module.css";
import { MdArrowUpward, MdArrowDownward } from "react-icons/md";
import MessageModal from "@/app/MessageModal";

// Define an interface for the Lecture structure in the subcollection
interface Lecture extends DocumentData {
  id: string; // Document ID for the lecture in the subcollection
  title: string;
  odyseeName: string;
  odyseeId: string;
  order: number; // To maintain the display order of lectures
  isHidden?: boolean; // New optional field to track visibility
}

interface Course extends DocumentData {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
}

export default function AdminDashboard() {
  // New state variables for admin check and loading
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [yearForNewCourse, setYearForNewCourse] = useState<
    "year1" | "year3 (Biology)" | "year3 (Geology)"
  >("year1");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [openLecturePanels, setOpenLecturePanels] = useState<Set<string>>(
    new Set()
  );

  const [lectureTitle, setLectureTitle] = useState("");
  const [odyseeLink, setOdyseeLink] = useState("");
  const [activeYearTab, setActiveYearTab] = useState<
    "year1" | "year3 (Biology)" | "year3 (Geology)"
  >("year1");

  const [courseLectures, setCourseLectures] = useState<
    Record<string, Lecture[]>
  >({}); // Store lectures per courseId
  const [loadingLectures, setLoadingLectures] = useState<Set<string>>(
    new Set()
  ); // Loading state per course for lectures

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const [cardsDirection, setCardsDirection] =
    useState<React.CSSProperties["flexDirection"]>("column-reverse"); // State for card direction
  const [generatedCode, setGeneratedCode] = useState<string>("");

  // Admin Check Logic
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is logged in, now check Firestore for admin status
        if (user.email) {
          const adminDocRef = doc(db, "admins", user.email);
          const adminDocSnap = await getDoc(adminDocRef);

          if (adminDocSnap.exists()) {
            // Document exists, user is an admin
            setIsAdmin(true);
          } else {
            // Document does not exist, not an admin, redirect
            router.push("/");
          }
        } else {
          // User has no email, redirect
          router.push("/");
        }
      } else {
        // No user logged in, redirect
        router.push("/");
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup the listener on component unmount
  }, [router]);

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

  const toggleCardsDirection = () => {
    setCardsDirection((prev) =>
      prev === "column" ? "column-reverse" : "column"
    );
  };

  // Function to fetch courses for a specific year
  const fetchCourses = async (
    yearToFetch: "year1" | "year3 (Biology)" | "year3 (Geology)"
  ) => {
    try {
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
      setCourses(fetched);
    } catch (error) {
      console.error(`Error fetching courses for ${yearToFetch}:`, error);
      setModalMessage(`Failed to load courses for ${yearToFetch}.`);
      setShowModal(true);
    }
  };

  // Function to fetch lectures for a specific course within a specific year
  const fetchLecturesForCourse = async (
    courseYear: "year1" | "year3 (Biology)" | "year3 (Geology)",
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

  const handleDelete = async (
    courseYear: "year1" | "year3 (Biology)" | "year3 (Geology)",
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
        isHidden: true,
      });

      setLectureTitle("");
      setOdyseeLink("");
      fetchLecturesForCourse(activeYearTab, courseId);
      setModalMessage("Lecture added successfully!");
      setShowModal(true);
    } catch (error: unknown) {
      console.error("Error adding lecture:", error);
      setModalMessage("Failed to add lecture: " + (error as Error).message);
      setShowModal(true);
    }
  };

  const handleDeleteLecture = async (courseId: string, lectureId: string) => {
    try {
      await deleteDoc(
        doc(
          db,
          `years/${activeYearTab}/courses/${courseId}/lectures`,
          lectureId
        )
      );
      fetchLecturesForCourse(activeYearTab, courseId);
      setModalMessage("Lecture deleted successfully!");
      setShowModal(true);
    } catch (error: unknown) {
      console.error("Error deleting lecture:", error);
      setModalMessage("Failed to delete lecture: " + (error as Error).message);
      setShowModal(true);
    }
  };

  const handleToggleLectureVisibility = async (
    courseId: string,
    lectureId: string,
    currentVisibility: boolean
  ) => {
    try {
      const lectureRef = doc(
        db,
        `years/${activeYearTab}/courses/${courseId}/lectures`,
        lectureId
      );
      await updateDoc(lectureRef, {
        isHidden: !currentVisibility,
      });
      fetchLecturesForCourse(activeYearTab, courseId);
      setModalMessage(
        `Lecture visibility updated successfully! It is now ${
          !currentVisibility ? "hidden" : "visible"
        }.`
      );
      setShowModal(true);
    } catch (error: unknown) {
      console.error("Error updating lecture visibility:", error);
      setModalMessage(
        "Failed to update lecture visibility: " + (error as Error).message
      );
      setShowModal(true);
    }
  };
  const handleGenerateUniversalCode = async () => {
    try {
      const generateCodeString = () => {
        const characters =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < 12; i++) {
          const randomIndex = Math.floor(Math.random() * characters.length);
          result += characters[randomIndex];
        }
        return result;
      };

      const newCode = generateCodeString();
      const codesCollectionRef = collection(db, "accessCodes");

      await addDoc(codesCollectionRef, {
        code: newCode,
        isUniversal: true,
        isUsed: false,
      });

      setGeneratedCode(newCode); // Set the generated code in state
      setModalMessage(`Universal one-time use code generated: ${newCode}`);
      setShowModal(true);
    } catch (error) {
      console.error("Error generating universal access code:", error);
      setModalMessage("Failed to generate universal code.");
      setShowModal(true);
    }
  };

  // NEW: Function to generate and save a universal one-time code

  useEffect(() => {
    // Only fetch courses if the user is an admin and the page is not loading
    if (isAdmin) {
      fetchCourses(activeYearTab);
    }
  }, [activeYearTab, isAdmin]);

  useEffect(() => {
    setYearForNewCourse(activeYearTab);
  }, [activeYearTab]);

  // If loading or not an admin, show a loading message or nothing
  if (loading) {
    return <div>Loading...</div>;
  }
  if (!isAdmin) {
    return null; // The redirect will handle sending them away
  }

  // Rest of the component renders only if the user is an admin
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
        <select
          value={yearForNewCourse}
          onChange={(e) =>
            setYearForNewCourse(
              e.target.value as "year1" | "year3 (Biology)" | "year3 (Geology)"
            )
          }
        >
          <option value="year1">Year 1</option>
          <option value="year3 (Biology)">Year 3 (Biology)</option>
          <option value="year3 (Geology)">Year 3 (Geology)</option>
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

      {/* NEW: Section for generating a universal code */}
      <section>
        <h2>Generate Universal Lecture Code</h2>
        <p>This code will unlock a single, locked lecture for one user.</p>
        <div
          className={styles.form}
          style={{ flexDirection: "row", gap: "1rem", alignItems: "center" }}
        >
          <button onClick={handleGenerateUniversalCode}>
            Generate New Universal Code
          </button>
          <input
            type="text"
            readOnly
            value={generatedCode}
            placeholder="Generated code will appear here"
            className={styles.generatedCodeInput}
          />
        </div>
      </section>

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
        <div className={styles.yearTabs}>
          <button
            className={activeYearTab === "year1" ? styles.activeTab : ""}
            onClick={() => setActiveYearTab("year1")}
          >
            Year 1
          </button>
          <button
            className={
              activeYearTab === "year3 (Biology)" ? styles.activeTab : ""
            }
            onClick={() => setActiveYearTab("year3 (Biology)")}
          >
            Year 3 (Biology)
          </button>
          <button
            className={
              activeYearTab === "year3 (Geology)" ? styles.activeTab : ""
            }
            onClick={() => setActiveYearTab("year3 (Geology)")}
          >
            Year 3 (Geology)
          </button>
        </div>
        <button onClick={toggleCardsDirection}>
          {cardsDirection === "column" ? (
            <MdArrowUpward />
          ) : (
            <MdArrowDownward />
          )}
        </button>
      </div>

      <div className={styles.cards} style={{ flexDirection: cardsDirection }}>
        {courses.map((course) => (
          <div key={course.id} className={styles.card}>
            <h2>{course.title}</h2>
            <p>{course.description}</p>
            <p>
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
                        <span
                          className={
                            lecture.isHidden ? styles.hiddenLecture : ""
                          }
                        >
                          {lecture.title} ({lecture.order + 1}) -{" "}
                          <strong>
                            {lecture.isHidden ? "Hidden" : "Visible"}
                          </strong>
                        </span>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() =>
                              router.push(
                                `/admin/lectures?year=${activeYearTab}&courseId=${course.id}&lectureId=${lecture.id}&lectureTitle=${lecture.title}`
                              )
                            }
                          >
                            Manage Lecture
                          </button>
                          <button
                            onClick={() =>
                              handleToggleLectureVisibility(
                                course.id,
                                lecture.id,
                                !!lecture.isHidden
                              )
                            }
                          >
                            {lecture.isHidden ? "Make Visible" : "Hide Lecture"}
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
