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

interface Lecture extends DocumentData {
  id: string;
  title: string;
  odyseeName: string;
  odyseeId: string;
  order: number;
  isHidden?: boolean;
  isEnabledCenter?: boolean;
  isEnabledOnline?: boolean;
  isEnabledSchool?: boolean;
}

interface Course extends DocumentData {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
}

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [title, setTitle] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
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
  >({});
  const [loadingLectures, setLoadingLectures] = useState<Set<string>>(
    new Set()
  );

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const [cardsDirection, setCardsDirection] =
    useState<React.CSSProperties["flexDirection"]>("column-reverse");
  const [generatedCode, setGeneratedCode] = useState<string>("");

  const [lectureQuizzesReady, setLectureQuizzesReady] = useState<
    Record<string, boolean>
  >({});

  const [updatingLecture, setUpdatingLecture] = useState<string | null>(null);

  const checkQuizzesExist = async (
    year: string,
    courseId: string,
    lectureId: string
  ) => {
    try {
      const settingsRef = collection(
        db,
        `years/${year}/courses/${courseId}/lectures/${lectureId}/quizSettings`
      );
      const settingsSnap = await getDocs(settingsRef);

      if (settingsSnap.empty) {
        setLectureQuizzesReady((prev) => ({ ...prev, [lectureId]: true }));
        return;
      }

      const variants = [
        "variant1Quizzes",
        "variant2Quizzes",
        "variant3Quizzes",
      ];
      let allPresent = true;

      for (const v of variants) {
        const vRef = collection(
          db,
          `years/${year}/courses/${courseId}/lectures/${lectureId}/${v}`
        );
        const vSnap = await getDocs(vRef);
        if (vSnap.empty) {
          allPresent = false;
          break;
        }
      }

      setLectureQuizzesReady((prev) => ({ ...prev, [lectureId]: allPresent }));
    } catch (err) {
      console.error("Error checking quizzes:", err);
      setLectureQuizzesReady((prev) => ({ ...prev, [lectureId]: false }));
    }
  };

  // Helper function to sync student progress with lecture enabled status
  const syncStudentProgressForLecture = async (
    year: string,
    courseId: string,
    lectureId: string,
    newEnabledStatus: boolean,
    systemType: "center" | "online" | "school"
  ) => {
    try {
      const studentsRef = collection(db, "students");
      const studentsSnap = await getDocs(studentsRef);

      let updatedCount = 0;
      let skippedCount = 0;
      let totalChecked = 0;

      console.log(`Starting sync for ${systemType} students...`);
      console.log(`Total students found: ${studentsSnap.docs.length}`);

      for (const studentDoc of studentsSnap.docs) {
        const uid = studentDoc.id;
        const studentData = studentDoc.data();

        totalChecked++;

        // Check if student belongs to the system we're updating
        const studentSystem = studentData.system;
        console.log(`Student ${uid}: system = ${studentSystem}`);

        if (studentSystem !== systemType) {
          skippedCount++;
          console.log(
            `Skipping student ${uid} - wrong system (${studentSystem} !== ${systemType})`
          );
          continue;
        }

        const progressDocId = `${year}_${courseId}_${lectureId}`;
        const progressRef = doc(db, "students", uid, "progress", progressDocId);

        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
          const progressData = progressSnap.data();

          console.log(`Student ${uid} progress:`, progressData);

          // Only update if unlocked is true
          if (progressData.unlocked === true) {
            console.log(
              `Updating student ${uid} isEnabled to ${newEnabledStatus}`
            );
            await updateDoc(progressRef, {
              isEnabled: newEnabledStatus,
            });
            updatedCount++;
          } else {
            console.log(`Student ${uid} not unlocked, skipping`);
          }
        } else {
          console.log(`No progress document for student ${uid}`);
        }
      }

      console.log(
        `Sync complete: ${updatedCount} updated, ${skippedCount} skipped (wrong system), ${totalChecked} total checked`
      );
      return updatedCount;
    } catch (error) {
      console.error("Error syncing student progress:", error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.email) {
          const adminDocRef = doc(db, "admins", user.email);
          const adminDocSnap = await getDoc(adminDocRef);

          if (adminDocSnap.exists()) {
            setIsAdmin(true);
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

  const toggleLecturePanel = async (courseId: string) => {
    setOpenLecturePanels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
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
      for (const lecture of fetchedLectures) {
        checkQuizzesExist(courseYear, courseId, lecture.id);
      }
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
    if (!title.trim()) {
      setModalMessage("Course title cannot be empty.");
      setShowModal(true);
      return;
    }
    try {
      await addDoc(collection(db, "years", yearForNewCourse, "courses"), {
        title,
        description: "",
        thumbnailUrl: thumbnailUrl.trim(),
      });
      setTitle("");
      setThumbnailUrl("");
      fetchCourses(activeYearTab);
      setModalMessage("Course created successfully!");
      setShowModal(true);
    } catch (error: unknown) {
      console.error("Error creating course:", error);
      setModalMessage("Failed to create course: " + (error as Error).message);
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
        isEnabledCenter: true,
        isEnabledOnline: true,
        isEnabledSchool: true,
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

  const handleToggleLectureEnabledCenter = async (
    courseId: string,
    lectureId: string,
    currentStatus: boolean
  ) => {
    const updateKey = `center_${lectureId}`;
    setUpdatingLecture(updateKey);

    try {
      const lectureRef = doc(
        db,
        `years/${activeYearTab}/courses/${courseId}/lectures`,
        lectureId
      );

      const newStatus = !currentStatus;

      await updateDoc(lectureRef, {
        isEnabledCenter: newStatus,
      });

      // Sync student progress to match the new status
      const updatedCount = await syncStudentProgressForLecture(
        activeYearTab,
        courseId,
        lectureId,
        newStatus,
        "center"
      );

      fetchLecturesForCourse(activeYearTab, courseId);
      setModalMessage(
        `Lecture status for center students updated to ${
          newStatus ? "enabled" : "disabled"
        }. ${updatedCount} center student progress records synced.`
      );
      setShowModal(true);
    } catch (error: unknown) {
      console.error(
        "Error updating lecture status for center students:",
        error
      );
      setModalMessage(
        "Failed to update lecture status for center students: " +
          (error as Error).message
      );
      setShowModal(true);
    } finally {
      setUpdatingLecture(null);
    }
  };

  const handleToggleLectureEnabledOnline = async (
    courseId: string,
    lectureId: string,
    currentStatus: boolean
  ) => {
    const updateKey = `online_${lectureId}`;
    setUpdatingLecture(updateKey);

    try {
      const lectureRef = doc(
        db,
        `years/${activeYearTab}/courses/${courseId}/lectures`,
        lectureId
      );

      const newStatus = !currentStatus;

      await updateDoc(lectureRef, {
        isEnabledOnline: newStatus,
      });

      // Sync student progress to match the new status
      const updatedCount = await syncStudentProgressForLecture(
        activeYearTab,
        courseId,
        lectureId,
        newStatus,
        "online"
      );

      fetchLecturesForCourse(activeYearTab, courseId);
      setModalMessage(
        `Lecture status for online students updated to ${
          newStatus ? "enabled" : "disabled"
        }. ${updatedCount} online student progress records synced.`
      );
      setShowModal(true);
    } catch (error: unknown) {
      console.error(
        "Error updating lecture status for online students:",
        error
      );
      setModalMessage(
        "Failed to update lecture status for online students: " +
          (error as Error).message
      );
      setShowModal(true);
    } finally {
      setUpdatingLecture(null);
    }
  };

  const handleToggleLectureEnabledSchool = async (
    courseId: string,
    lectureId: string,
    currentStatus: boolean
  ) => {
    const updateKey = `school_${lectureId}`;
    setUpdatingLecture(updateKey);

    try {
      const lectureRef = doc(
        db,
        `years/${activeYearTab}/courses/${courseId}/lectures`,
        lectureId
      );

      const newStatus = !currentStatus;

      await updateDoc(lectureRef, {
        isEnabledSchool: newStatus,
      });

      // Sync student progress to match the new status
      const updatedCount = await syncStudentProgressForLecture(
        activeYearTab,
        courseId,
        lectureId,
        newStatus,
        "school"
      );

      fetchLecturesForCourse(activeYearTab, courseId);
      setModalMessage(
        `Lecture status for School students updated to ${
          newStatus ? "enabled" : "disabled"
        }. ${updatedCount} school student progress records synced.`
      );
      setShowModal(true);
    } catch (error: unknown) {
      console.error(
        "Error updating lecture status for school students:",
        error
      );
      setModalMessage(
        "Failed to update lecture status for school students: " +
          (error as Error).message
      );
      setShowModal(true);
    } finally {
      setUpdatingLecture(null);
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

      setGeneratedCode(newCode);
      setModalMessage(`Universal one-time use code generated: ${newCode}`);
      setShowModal(true);
    } catch (error) {
      console.error("Error generating universal access code:", error);
      setModalMessage("Failed to generate universal code.");
      setShowModal(true);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchCourses(activeYearTab);
    }
  }, [activeYearTab, isAdmin]);

  useEffect(() => {
    setYearForNewCourse(activeYearTab);
  }, [activeYearTab]);

  if (loading) {
    return <div>Loading...</div>;
  }
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="wrapper">
      <h1>Admin Dashboard</h1>
      <hr />
      <h1>Create Course</h1>
      <div className={styles.form}>
        <input
          type="text"
          placeholder="Course title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="url"
          placeholder="Thumbnail URL (optional)"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
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

      <hr />

      <section>
        <h2>Generate Code</h2>
        <p>This code will unlock a single, locked lecture for one user.</p>
        <div
          className={styles.form}
          style={{ flexDirection: "row", gap: "1rem", alignItems: "center" }}
        >
          <button onClick={handleGenerateUniversalCode}>Generate Code</button>
          <input
            type="text"
            readOnly
            value={generatedCode}
            placeholder="Generated code will appear here"
            className={styles.generatedCodeInput}
          />
          <button
            onClick={() => {
              if (generatedCode) {
                navigator.clipboard.writeText(generatedCode);
              }

              setModalMessage(`Code copied to clipboard!`);
              setShowModal(true);
            }}
          >
            Copy
          </button>
        </div>
      </section>

      <hr />

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
                  style={{ marginBottom: "10px" }}
                />
                <input
                  type="text"
                  placeholder="Odysee link"
                  value={odyseeLink}
                  onChange={(e) => setOdyseeLink(e.target.value)}
                  style={{ marginBottom: "10px" }}
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
                      <React.Fragment key={lecture.id}>
                        <li>
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
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              flexWrap: "wrap",
                            }}
                          >
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
                              disabled={
                                lectureQuizzesReady[lecture.id] !== true
                              }
                              style={{
                                backgroundColor:
                                  lectureQuizzesReady[lecture.id] !== true
                                    ? "grey"
                                    : "var(--blue)",
                                cursor:
                                  lectureQuizzesReady[lecture.id] !== true
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                              onClick={() => {
                                if (lectureQuizzesReady[lecture.id] !== true)
                                  return;

                                handleToggleLectureVisibility(
                                  course.id,
                                  lecture.id,
                                  !!lecture.isHidden
                                );
                              }}
                            >
                              {lecture.isHidden
                                ? "Make Visible"
                                : "Hide Lecture"}
                            </button>

                            <button
                              disabled={
                                updatingLecture === `center_${lecture.id}`
                              }
                              style={{
                                backgroundColor:
                                  updatingLecture === `center_${lecture.id}`
                                    ? "grey"
                                    : lecture.isEnabledCenter !== false
                                    ? "var(--green)"
                                    : "var(--red)",
                                color: "white",
                                cursor:
                                  updatingLecture === `center_${lecture.id}`
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                              onClick={() =>
                                handleToggleLectureEnabledCenter(
                                  course.id,
                                  lecture.id,
                                  lecture.isEnabledCenter !== false
                                )
                              }
                            >
                              {updatingLecture === `center_${lecture.id}`
                                ? "Updating..."
                                : `Center: ${
                                    lecture.isEnabledCenter !== false
                                      ? "Enabled"
                                      : "Disabled"
                                  }`}
                            </button>

                            <button
                              disabled={
                                updatingLecture === `online_${lecture.id}`
                              }
                              style={{
                                backgroundColor:
                                  updatingLecture === `online_${lecture.id}`
                                    ? "grey"
                                    : lecture.isEnabledOnline !== false
                                    ? "var(--green)"
                                    : "var(--red)",
                                color: "white",
                                cursor:
                                  updatingLecture === `online_${lecture.id}`
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                              onClick={() =>
                                handleToggleLectureEnabledOnline(
                                  course.id,
                                  lecture.id,
                                  lecture.isEnabledOnline !== false
                                )
                              }
                            >
                              {updatingLecture === `online_${lecture.id}`
                                ? "Updating..."
                                : `Online: ${
                                    lecture.isEnabledOnline !== false
                                      ? "Enabled"
                                      : "Disabled"
                                  }`}
                            </button>

                            <button
                              disabled={
                                updatingLecture === `school_${lecture.id}`
                              }
                              style={{
                                backgroundColor:
                                  updatingLecture === `school_${lecture.id}`
                                    ? "grey"
                                    : lecture.isEnabledSchool !== false
                                    ? "var(--green)"
                                    : "var(--red)",
                                color: "white",
                                cursor:
                                  updatingLecture === `school_${lecture.id}`
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                              onClick={() =>
                                handleToggleLectureEnabledSchool(
                                  course.id,
                                  lecture.id,
                                  lecture.isEnabledSchool !== false
                                )
                              }
                            >
                              {updatingLecture === `school_${lecture.id}`
                                ? "Updating..."
                                : `School: ${
                                    lecture.isEnabledSchool !== false
                                      ? "Enabled"
                                      : "Disabled"
                                  }`}
                            </button>

                            <button
                              onClick={() =>
                                router.push(
                                  `/admin/viewLecture?year=${activeYearTab}&courseId=${course.id}&lectureId=${lecture.id}&lectureTitle=${lecture.title}&odyseeName=${lecture.odyseeName}&odyseeId=${lecture.odyseeId}`
                                )
                              }
                            >
                              View Lecture
                            </button>
                          </div>
                        </li>
                        <hr />
                      </React.Fragment>
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
