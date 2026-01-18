"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  arrayRemove,
  deleteField,
} from "firebase/firestore";
import {
  MdEdit,
  MdSave,
  MdClose,
  MdContentCopy,
  MdCheck,
  MdDelete,
} from "react-icons/md";
import styles from "./student-profile.module.css";
import Loading from "@/app/components/Loading";

interface StudentInfo {
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
  uid: string;
  devices?: string[];
  system?: string;
}

interface QuizData {
  earnedMarks: number;
  totalPossibleMarks: number;
}

interface ProgressItem {
  id: string;
  courseTitle: string;
  lectureTitle: string;
  quiz: QuizData;
  isHidden: boolean;
}

function EditableField({
  label,
  value,
  fieldKey,
  onSave,
  editable = true,
}: {
  label: string;
  value: string;
  fieldKey: string;
  onSave: (field: string, newValue: string) => Promise<void>;
  editable?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = async () => {
    await onSave(fieldKey, editValue);
    setEditing(false);
  };

  return (
    <div className={styles.infoItem}>
      <strong>{label}:</strong>
      {editing ? (
        <div className={styles.editContainer}>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className={styles.editInput}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={handleSave} title="Save">
              <MdSave size={16} />
            </button>
            <button
              style={{ backgroundColor: "var(--red)" }}
              onClick={() => setEditing(false)}
              title="Cancel"
            >
              <MdClose size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.editContainer}>
          <span>{value || "—"}</span>
          {editable && (
            <button onClick={() => setEditing(true)} title="Edit">
              <MdEdit size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EditableSelect({
  label,
  value,
  fieldKey,
  options,
  onSave,
}: {
  label: string;
  value: string;
  fieldKey: string;
  options: { value: string; label: string }[];
  onSave: (field: string, newValue: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = async () => {
    await onSave(fieldKey, editValue);
    setEditing(false);
  };

  return (
    <div className={styles.infoItem}>
      <strong>{label}:</strong>
      {editing ? (
        <div className={styles.editContainer}>
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={handleSave} title="Save">
              <MdSave size={16} />
            </button>
            <button
              style={{ backgroundColor: "var(--red)" }}
              onClick={() => setEditing(false)}
              title="Cancel"
            >
              <MdClose size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.editContainer}>
          <span style={{ textTransform: "capitalize" }}>
            {value || "Not set"}
          </span>
          <button onClick={() => setEditing(true)} title="Edit">
            <MdEdit size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function ReadonlyField({
  label,
  value,
  copyable,
  onCopy,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  return (
    <div className={styles.infoItem}>
      <div className={styles.editContainer}>
        <strong>{label}:</strong>
        {copyable && (
          <button onClick={handleCopy} title={copied ? "Copied!" : "Copy"}>
            {copied ? <MdCheck size={14} /> : <MdContentCopy size={14} />}
          </button>
        )}
      </div>
      <span>{value || "—"}</span>
    </div>
  );
}

export default function StudentProfileContent() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("id");
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [progressData, setProgressData] = useState<ProgressItem[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user?.email) return router.push("/");

      const adminDoc = await getDoc(doc(db, "superAdmins", user.email));
      if (!adminDoc.exists()) return router.push("/");

      setIsAdmin(true);
      await fetchStudentData();
    });

    return () => unsubscribe();
  }, [studentId, router]);

  const fetchStudentData = async () => {
    if (!studentId) {
      setError("No student ID provided.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const studentDoc = await getDoc(doc(db, "students", studentId));
      if (!studentDoc.exists()) {
        setError("Student not found.");
        return;
      }

      const studentData = studentDoc.data() as StudentInfo;
      setStudentInfo(studentData);

      const progressSnapshot = await getDocs(
        collection(db, "students", studentId, "progress"),
      );

      const items: ProgressItem[] = await Promise.all(
        progressSnapshot.docs.map(async (docSnap) => {
          const quiz = docSnap.data() as QuizData;
          const [year, courseId, lectureId] = docSnap.id.split("_");

          let courseTitle = courseId;
          try {
            const courseDoc = await getDoc(
              doc(db, "years", year, "courses", courseId),
            );
            if (courseDoc.exists()) {
              courseTitle = courseDoc.data().title || courseId;
            }
          } catch {}

          let lectureTitle = lectureId;
          let isHidden = false;
          try {
            const lectureDoc = await getDoc(
              doc(
                db,
                "years",
                year,
                "courses",
                courseId,
                "lectures",
                lectureId,
              ),
            );
            if (lectureDoc.exists()) {
              const data = lectureDoc.data();
              lectureTitle = data.title || lectureId;
              isHidden = !!data.isHidden;
            }
          } catch {}

          return {
            id: docSnap.id,
            quiz,
            courseTitle,
            lectureTitle,
            isHidden,
          };
        }),
      );

      setProgressData(items.filter((i) => !i.isHidden));
    } catch (err) {
      console.error(err);
      setError("Failed to load student data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (field: string, value: string) => {
    if (!studentId || !studentInfo) return;
    await updateDoc(doc(db, "students", studentId), { [field]: value });
    setStudentInfo({ ...studentInfo, [field]: value });
  };

  const handleDeleteDevices = async () => {
    if (!studentId || !studentInfo) return;
    const confirmed = window.confirm("Delete all registered devices?");
    if (!confirmed) return;

    await updateDoc(doc(db, "students", studentId), { devices: deleteField() });
    setStudentInfo({ ...studentInfo, devices: undefined });
  };

  const handleDeleteOneDevice = async (deviceToDelete: string) => {
    if (!studentId || !studentInfo) return;
    const confirmed = window.confirm("Delete this registered device?");
    if (!confirmed) return;

    await updateDoc(doc(db, "students", studentId), {
      devices: arrayRemove(deviceToDelete),
    });

    setStudentInfo({
      ...studentInfo,
      devices: studentInfo.devices?.filter((d) => d !== deviceToDelete),
    });
  };

  if (loading) return <Loading text="Loading student profile..." />;

  if (error)
    return (
      <div className={styles.center}>
        <p className={styles.error}>{error}</p>
        <button onClick={() => router.push("/sadmins/students")}>
          Go Back
        </button>
      </div>
    );

  if (!studentInfo)
    return (
      <div className={styles.center}>
        <p>Student not found.</p>
        <button onClick={() => router.push("/sadmins/students")}>
          Go Back
        </button>
      </div>
    );

  const personalFields = [
    { key: "firstName", label: "First Name" },
    { key: "secondName", label: "Second Name" },
    { key: "thirdName", label: "Third Name" },
    { key: "forthName", label: "Fourth Name" },
    { key: "email", label: "Email" },
    { key: "school", label: "School" },
    { key: "studentPhone", label: "Student Phone" },
    { key: "fatherPhone", label: "Father's Phone" },
    { key: "motherPhone", label: "Mother's Phone" },
  ];

  return (
    <div className="wrapper">
      <div className={styles.header}>
        <button onClick={() => router.push("/sadmins/students")}>← Back</button>
        <h1>Student Profile</h1>
      </div>

      {/* Personal Info */}
      <div className={styles.section}>
        <h2>Personal Information</h2>
        <div className={styles.infoGrid}>
          {personalFields.map(({ key, label }) => (
            <EditableField
              key={key}
              label={label}
              value={
                Array.isArray(studentInfo[key as keyof StudentInfo])
                  ? (studentInfo[key as keyof StudentInfo] as string[]).join(
                      ", ",
                    )
                  : (studentInfo[key as keyof StudentInfo] as string) || ""
              }
              fieldKey={key}
              onSave={handleSave}
            />
          ))}

          <EditableSelect
            label="Gender"
            fieldKey="gender"
            value={studentInfo.gender}
            onSave={handleSave}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ]}
          />

          <EditableSelect
            label="System"
            fieldKey="system"
            value={studentInfo.system || "online"}
            onSave={handleSave}
            options={[
              { value: "online", label: "Online" },
              { value: "center", label: "Center" },
              { value: "school", label: "School" },
            ]}
          />

          <EditableSelect
            label="Year"
            fieldKey="year"
            value={studentInfo.year}
            onSave={handleSave}
            options={[
              { value: "year1", label: "Year 1" },
              { value: "year3", label: "Year 3" },
            ]}
          />

          <ReadonlyField
            label="Student Code"
            value={studentInfo.studentCode}
            copyable
          />
          <ReadonlyField label="UID" value={studentInfo.uid} copyable />

          {studentInfo.devices && (
            <div className={styles.infoItem}>
              <strong>Devices:</strong>
              <ul>
                <li
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>
                    {studentInfo.devices.length} device(s){" "}
                    <button
                      style={{ backgroundColor: "var(--red)" }}
                      onClick={handleDeleteDevices}
                      title="Delete Devices"
                    >
                      <MdDelete size={14} />
                    </button>{" "}
                  </span>
                </li>
                {studentInfo.devices.map((device, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{device}</span>
                    <button
                      style={{ backgroundColor: "var(--red)" }}
                      onClick={() => handleDeleteOneDevice(device)}
                      title="Delete Device"
                    >
                      <MdDelete size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Quiz Results */}
      <div className={styles.section}>
        <h2>Quiz Results</h2>
        {progressData.length ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Course</th>
                <th>Lecture</th>
                <th>Score</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {progressData.map((item) => {
                const pct = Math.round(
                  (item.quiz.earnedMarks / item.quiz.totalPossibleMarks) * 100,
                );
                return (
                  <tr key={item.id}>
                    <td>{item.courseTitle}</td>
                    <td>{item.lectureTitle}</td>
                    <td>
                      {item.quiz.earnedMarks} / {item.quiz.totalPossibleMarks}
                    </td>
                    <td>
                      <span
                        className={`${styles.percentage} ${
                          pct >= 70
                            ? styles.good
                            : pct >= 50
                              ? styles.average
                              : styles.poor
                        }`}
                      >
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className={styles.empty}>
            This student hasn’t completed any quizzes yet.
          </p>
        )}
      </div>
    </div>
  );
}
