"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Html5Qrcode } from "html5-qrcode";
import {
  FaQrcode,
  FaStop,
  FaCheck,
  FaTimes,
  FaSearch,
  FaChevronRight,
} from "react-icons/fa";
import styles from "./attendance.module.css";
import Loading from "@/app/components/Loading";
import Modal, { ModalVariant } from "@/app/components/Modal";

// --- Interfaces ---
interface StudentData {
  uid: string;
  firstName: string;
  secondName: string;
  thirdName: string;
  forthName: string;
  studentCode: string;
  system: string;
  year: string;
}

interface AttendanceRecord {
  studentName: string;
  studentCode: string;
  markedAt: string;
  markedBy: string;
}

interface CourseData {
  id: string;
  title: string;
}

interface LectureData {
  id: string;
  title: string;
  order: number;
}

type YearKey = "year1" | "year3 (Biology)" | "year3 (Geology)";

// --- Scan feedback ---
interface ScanFeedback {
  type: "success" | "error" | "duplicate";
  message: string;
}

export default function AttendancePage() {
  const router = useRouter();

  // Auth
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection hierarchy
  const [selectedYear, setSelectedYear] = useState<YearKey | null>(null);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);
  const [lectures, setLectures] = useState<LectureData[]>([]);
  const [selectedLecture, setSelectedLecture] = useState<LectureData | null>(
    null,
  );
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingLectures, setLoadingLectures] = useState(false);

  // Attendance data
  const [allStudents, setAllStudents] = useState<StudentData[]>([]);
  const [attendedUids, setAttendedUids] = useState<
    Map<string, AttendanceRecord>
  >(new Map());
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Scanner
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalVariant, setModalVariant] = useState<ModalVariant>("info");

  const years: YearKey[] = ["year1", "year3 (Biology)", "year3 (Geology)"];
  const yearLabels: Record<YearKey, string> = {
    year1: "Year 1",
    "year3 (Biology)": "Year 3 (Biology)",
    "year3 (Geology)": "Year 3 (Geology)",
  };

  // --- Auth Guard ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user?.email) {
          const adminDocRef = doc(db, "superAdmins", user.email);
          const adminDocSnap = await getDoc(adminDocRef);
          if (adminDocSnap.exists()) {
            setIsAdmin(true);
            setAdminEmail(user.email);
          } else {
            setError("Access denied: Admin privileges required");
            setTimeout(() => router.push("/"), 200);
          }
        } else {
          setError("Authentication required");
          setTimeout(() => router.push("/"), 200);
        }
      } catch (err) {
        console.error("Error checking admin status:", err);
        setError("Error verifying admin status");
        setTimeout(() => router.push("/"), 200);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // --- Fetch Courses ---
  const fetchCourses = useCallback(async (year: YearKey) => {
    setLoadingCourses(true);
    try {
      const coursesRef = collection(db, "years", year, "courses");
      const snapshot = await getDocs(coursesRef);
      const fetched: CourseData[] = snapshot.docs.map((d) => ({
        id: d.id,
        title: (d.data().title as string) || d.id,
      }));
      fetched.sort((a, b) => a.title.localeCompare(b.title));
      setCourses(fetched);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setModalMessage("Failed to load courses.");
      setModalVariant("error");
      setShowModal(true);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  // --- Fetch Lectures ---
  const fetchLectures = useCallback(async (year: YearKey, courseId: string) => {
    setLoadingLectures(true);
    try {
      const lecturesRef = collection(
        db,
        `years/${year}/courses/${courseId}/lectures`,
      );
      const q = query(lecturesRef, orderBy("order"));
      const snapshot = await getDocs(q);
      const fetched: LectureData[] = snapshot.docs.map((d) => ({
        id: d.id,
        title: (d.data().title as string) || d.id,
        order: (d.data().order as number) || 0,
      }));
      setLectures(fetched);
    } catch (err) {
      console.error("Error fetching lectures:", err);
      setModalMessage("Failed to load lectures.");
      setModalVariant("error");
      setShowModal(true);
    } finally {
      setLoadingLectures(false);
    }
  }, []);

  // --- Fetch Students & Attendance ---
  const fetchStudentsAndAttendance = useCallback(
    async (year: YearKey, courseId: string, lectureId: string) => {
      setLoadingStudents(true);
      try {
        // Fetch all students that are center or school
        const studentsRef = collection(db, "students");
        const snapshot = await getDocs(studentsRef);

        // We need to match year format. Students register with "year1" or "year3".
        // The admin years are "year1", "year3 (Biology)", "year3 (Geology)".
        // So we match by prefix: year1 matches year1, year3 matches year3 (Biology) and year3 (Geology).
        const yearPrefix = year.startsWith("year3") ? "year3" : "year1";

        const eligible: StudentData[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data();
          const sys = (data.system as string) || "";
          const stuYear = (data.year as string) || "";
          if (
            (sys === "center" || sys === "school") &&
            stuYear === yearPrefix
          ) {
            eligible.push({
              uid: d.id,
              firstName: (data.firstName as string) || "",
              secondName: (data.secondName as string) || "",
              thirdName: (data.thirdName as string) || "",
              forthName: (data.forthName as string) || "",
              studentCode: (data.studentCode as string) || "",
              system: sys,
              year: stuYear,
            });
          }
        });

        eligible.sort((a, b) =>
          `${a.firstName} ${a.secondName}`.localeCompare(
            `${b.firstName} ${b.secondName}`,
          ),
        );
        setAllStudents(eligible);

        // Fetch existing attendance
        const attendanceRef = collection(
          db,
          `years/${year}/courses/${courseId}/lectures/${lectureId}/attendance`,
        );
        const attendanceSnap = await getDocs(attendanceRef);
        const attended = new Map<string, AttendanceRecord>();
        attendanceSnap.docs.forEach((d) => {
          attended.set(d.id, d.data() as AttendanceRecord);
        });
        setAttendedUids(attended);
      } catch (err) {
        console.error("Error fetching students/attendance:", err);
        setModalMessage("Failed to load student data.");
        setModalVariant("error");
        setShowModal(true);
      } finally {
        setLoadingStudents(false);
      }
    },
    [],
  );

  // --- Year Selection ---
  const handleYearSelect = (year: YearKey) => {
    // Clean up scanner if active
    stopScanner();
    setSelectedYear(year);
    setSelectedCourse(null);
    setSelectedLecture(null);
    setCourses([]);
    setLectures([]);
    setAllStudents([]);
    setAttendedUids(new Map());
    fetchCourses(year);
  };

  // --- Course Selection ---
  const handleCourseSelect = (course: CourseData) => {
    stopScanner();
    setSelectedCourse(course);
    setSelectedLecture(null);
    setLectures([]);
    setAllStudents([]);
    setAttendedUids(new Map());
    if (selectedYear) {
      fetchLectures(selectedYear, course.id);
    }
  };

  // --- Lecture Selection ---
  const handleLectureSelect = (lecture: LectureData) => {
    stopScanner();
    setSelectedLecture(lecture);
    if (selectedYear && selectedCourse) {
      fetchStudentsAndAttendance(selectedYear, selectedCourse.id, lecture.id);
    }
  };

  // --- Mark Attendance ---
  const markAttendance = useCallback(
    async (student: StudentData) => {
      if (!selectedYear || !selectedCourse || !selectedLecture || !adminEmail)
        return;

      // Check if already attended
      if (attendedUids.has(student.uid)) {
        showScanFeedback(
          "duplicate",
          `${student.firstName} ${student.secondName} is already marked present.`,
        );
        return;
      }

      try {
        const attendanceRef = doc(
          db,
          `years/${selectedYear}/courses/${selectedCourse.id}/lectures/${selectedLecture.id}/attendance`,
          student.uid,
        );

        const record: AttendanceRecord = {
          studentName: `${student.firstName} ${student.secondName} ${student.thirdName} ${student.forthName}`,
          studentCode: student.studentCode,
          markedAt: new Date().toISOString(),
          markedBy: adminEmail,
        };

        await setDoc(attendanceRef, record);

        setAttendedUids((prev) => {
          const updated = new Map(prev);
          updated.set(student.uid, record);
          return updated;
        });

        showScanFeedback(
          "success",
          `✓ ${student.firstName} ${student.secondName} marked present!`,
        );
      } catch (err) {
        console.error("Error marking attendance:", err);
        showScanFeedback("error", "Failed to mark attendance. Try again.");
      }
    },
    [selectedYear, selectedCourse, selectedLecture, adminEmail, attendedUids],
  );

  // --- Scan Feedback ---
  const showScanFeedback = (type: ScanFeedback["type"], message: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setScanFeedback({ type, message });
    feedbackTimerRef.current = setTimeout(() => {
      setScanFeedback(null);
    }, 4000);
  };

  // --- QR Scanner ---
  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // decodedText should be the studentCode
          await handleScanResult(decodedText.trim());
        },
        () => {
          // ignore errors (no QR found in frame)
        },
      );

      setScannerActive(true);
    } catch (err) {
      console.error("Scanner error:", err);
      setModalMessage(
        "Could not start camera. Please ensure camera permissions are granted.",
      );
      setModalVariant("error");
      setShowModal(true);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // scanner might already be stopped
      }
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  // Handle scan result
  const handleScanResult = useCallback(
    async (scannedCode: string) => {
      // Find student by studentCode
      const student = allStudents.find((s) => s.studentCode === scannedCode);

      if (!student) {
        showScanFeedback(
          "error",
          `No eligible student found with code: ${scannedCode}`,
        );
        return;
      }

      await markAttendance(student);
    },
    [allStudents, markAttendance],
  );

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // --- Derived Data ---
  const attendedStudents = allStudents.filter((s) => attendedUids.has(s.uid));
  const notAttendedStudents = allStudents.filter(
    (s) => !attendedUids.has(s.uid),
  );

  // Search filter
  const filterBySearch = (students: StudentData[]) => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter((s) => {
      const fullName =
        `${s.firstName} ${s.secondName} ${s.thirdName} ${s.forthName}`.toLowerCase();
      return fullName.includes(q) || s.studentCode.includes(q);
    });
  };

  const filteredAttended = filterBySearch(attendedStudents);
  const filteredNotAttended = filterBySearch(notAttendedStudents);

  // --- Render ---
  if (loading) {
    return <Loading text="Verifying admin access..." />;
  }

  if (error) {
    return (
      <div className="wrapper" style={{ textAlign: "center", padding: "2rem" }}>
        <div
          style={{
            fontSize: "1.5rem",
            color: "var(--red, #dc3545)",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
        <div style={{ color: "var(--gray, #6c757d)" }}>
          Redirecting to home page...
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="wrapper">
      {showModal && (
        <Modal
          isOpen={showModal}
          message={modalMessage}
          variant={modalVariant}
          onClose={() => setShowModal(false)}
        />
      )}

      <h1 style={{ marginBottom: "var(--spacing-md)" }}>
        Attendance Management
      </h1>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <button
          onClick={() => {
            stopScanner();
            setSelectedYear(null);
            setSelectedCourse(null);
            setSelectedLecture(null);
          }}
        >
          Attendance
        </button>
        {selectedYear && (
          <>
            <span className={styles.separator}>
              <FaChevronRight size={10} />
            </span>
            <button
              onClick={() => {
                stopScanner();
                setSelectedCourse(null);
                setSelectedLecture(null);
              }}
            >
              {yearLabels[selectedYear]}
            </button>
          </>
        )}
        {selectedCourse && (
          <>
            <span className={styles.separator}>
              <FaChevronRight size={10} />
            </span>
            <button
              onClick={() => {
                stopScanner();
                setSelectedLecture(null);
              }}
            >
              {selectedCourse.title}
            </button>
          </>
        )}
        {selectedLecture && (
          <>
            <span className={styles.separator}>
              <FaChevronRight size={10} />
            </span>
            <span className={styles.current}>{selectedLecture.title}</span>
          </>
        )}
      </div>

      {/* Step 1: Select Year */}
      {!selectedYear && (
        <>
          <h2
            className="sectionTitle"
            style={{ marginBottom: "var(--spacing-lg)" }}
          >
            Select Year
          </h2>
          <div className={styles.yearTabs}>
            {years.map((y) => (
              <button
                key={y}
                className={styles.yearTab}
                onClick={() => handleYearSelect(y)}
              >
                {yearLabels[y]}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Step 2: Select Course */}
      {selectedYear && !selectedCourse && (
        <>
          <h2
            className="sectionTitle"
            style={{ marginBottom: "var(--spacing-lg)" }}
          >
            Select Course
          </h2>
          {loadingCourses ? (
            <Loading text="Loading courses..." />
          ) : courses.length === 0 ? (
            <p style={{ color: "var(--light)" }}>
              No courses found for {yearLabels[selectedYear]}.
            </p>
          ) : (
            <div className={styles.itemGrid}>
              {courses.map((c) => (
                <div
                  key={c.id}
                  className={styles.itemCard}
                  onClick={() => handleCourseSelect(c)}
                >
                  <FaChevronRight color="var(--blue)" />
                  <div>
                    <h3>{c.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Step 3: Select Lecture */}
      {selectedYear && selectedCourse && !selectedLecture && (
        <>
          <h2
            className="sectionTitle"
            style={{ marginBottom: "var(--spacing-lg)" }}
          >
            Select Lecture
          </h2>
          {loadingLectures ? (
            <Loading text="Loading lectures..." />
          ) : lectures.length === 0 ? (
            <p style={{ color: "var(--light)" }}>
              No lectures found for {selectedCourse.title}.
            </p>
          ) : (
            <div className={styles.lectureList}>
              {lectures.map((l) => (
                <div
                  key={l.id}
                  className={styles.lectureItem}
                  onClick={() => handleLectureSelect(l)}
                >
                  <span>{l.title}</span>
                  <small>Lecture #{l.order + 1}</small>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Step 4: Attendance Dashboard */}
      {selectedYear && selectedCourse && selectedLecture && (
        <>
          {loadingStudents ? (
            <Loading text="Loading students..." />
          ) : (
            <>
              {/* Stats Bar */}
              <div className={styles.statsBar}>
                <div className={styles.statItem}>
                  <span
                    className={styles.statNumber}
                    style={{ color: "var(--green)" }}
                  >
                    {attendedStudents.length}
                  </span>
                  <span className={styles.statLabel}>Present</span>
                </div>
                <div className={styles.statItem}>
                  <span
                    className={styles.statNumber}
                    style={{ color: "var(--red)" }}
                  >
                    {notAttendedStudents.length}
                  </span>
                  <span className={styles.statLabel}>Absent</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>
                    {allStudents.length}
                  </span>
                  <span className={styles.statLabel}>Total</span>
                </div>
                <div className={styles.progressBarContainer}>
                  <div
                    className={styles.progressBarFill}
                    style={{
                      width:
                        allStudents.length > 0
                          ? `${(attendedStudents.length / allStudents.length) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>

              {/* Scanner Section */}
              <div className={styles.scannerSection}>
                <div className={styles.scannerToggle}>
                  {!scannerActive ? (
                    <button
                      className={styles.scannerBtn}
                      onClick={startScanner}
                    >
                      <FaQrcode /> Open Scanner
                    </button>
                  ) : (
                    <button
                      className={`${styles.scannerBtn} ${styles.stopBtn}`}
                      onClick={stopScanner}
                    >
                      <FaStop /> Stop Scanner
                    </button>
                  )}
                </div>

                <div
                  id="qr-reader"
                  className={styles.scannerViewport}
                  style={{ display: scannerActive ? "block" : "none" }}
                />

                {/* Scan Feedback */}
                {scanFeedback && (
                  <div
                    className={`${styles.scanFeedback} ${
                      scanFeedback.type === "success"
                        ? styles.scanSuccess
                        : scanFeedback.type === "duplicate"
                          ? styles.scanDuplicate
                          : styles.scanError
                    }`}
                  >
                    {scanFeedback.type === "success" ? (
                      <FaCheck />
                    ) : (
                      <FaTimes />
                    )}
                    {scanFeedback.message}
                  </div>
                )}
              </div>

              {/* Search */}
              <div style={{ position: "relative" }}>
                <FaSearch
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--light)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search students by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchBar}
                  style={{ paddingLeft: "2.2rem" }}
                />
              </div>

              {/* Two-column tables */}
              <div className={styles.tablesContainer}>
                {/* Attended Column */}
                <div className={styles.tableColumn}>
                  <div
                    className={`${styles.tableHeader} ${styles.tableHeaderAttended}`}
                  >
                    <span>✓ Attended ({filteredAttended.length})</span>
                  </div>
                  {filteredAttended.length === 0 ? (
                    <div className={styles.emptyList}>
                      No students marked yet
                    </div>
                  ) : (
                    filteredAttended.map((s) => {
                      const record = attendedUids.get(s.uid);
                      const time = record
                        ? new Date(record.markedAt).toLocaleTimeString()
                        : "";
                      return (
                        <div key={s.uid} className={styles.studentRow}>
                          <span className={styles.studentName}>
                            {s.firstName} {s.secondName} {s.thirdName}{" "}
                            {s.forthName}
                          </span>
                          <span className={styles.studentTime}>{time}</span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Not Attended Column */}
                <div className={styles.tableColumn}>
                  <div
                    className={`${styles.tableHeader} ${styles.tableHeaderNotAttended}`}
                  >
                    <span>✗ Not Attended ({filteredNotAttended.length})</span>
                  </div>
                  {filteredNotAttended.length === 0 ? (
                    <div className={styles.emptyList}>
                      All students are present! 🎉
                    </div>
                  ) : (
                    filteredNotAttended.map((s) => (
                      <div key={s.uid} className={styles.studentRow}>
                        <span className={styles.studentName}>
                          {s.firstName} {s.secondName} {s.thirdName}{" "}
                          {s.forthName}
                        </span>
                        <button
                          className={styles.markBtn}
                          onClick={() => markAttendance(s)}
                        >
                          Mark Present
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
