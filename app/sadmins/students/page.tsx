"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import styles from "./students.module.css";
import Loading from "@/app/components/Loading";

interface StudentData {
  uid: string;
  firstName: string;
  secondName: string;
  thirdName: string;
  forthName: string;
  system: string;
  studentPhone: string;
  fatherPhone: string;
  motherPhone: string;
  year: string;
  gender: string;
}

export default function StudentsPage() {
  const [isAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  // Define available systems
  const systemOptions = ["center", "online", "school"];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.email) {
          const adminDocRef = doc(db, "superAdmins", user.email);
          const adminDocSnap = await getDoc(adminDocRef);

          if (adminDocSnap.exists()) {
            setIsSuperAdmin(true);
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

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studentsCollection = collection(db, "students");
        const studentSnapshot = await getDocs(studentsCollection);

        const loadedStudents: StudentData[] = studentSnapshot.docs.map(
          (doc) => {
            const data = doc.data() as StudentData;
            return {
              uid: doc.id,
              firstName: data.firstName || "",
              secondName: data.secondName || "",
              thirdName: data.thirdName || "",
              forthName: data.forthName || "",
              system: data.system || "",
              studentPhone: data.studentPhone || "",
              fatherPhone: data.fatherPhone || "",
              motherPhone: data.motherPhone || "",
              year: data.year || "Unknown",
              gender: data.gender || "N/A",
            };
          },
        );

        // sort by year then by name
        loadedStudents.sort((a, b) => {
          if (a.year === b.year) {
            return `${a.firstName} ${a.secondName}`.localeCompare(
              `${b.firstName} ${b.secondName}`,
            );
          }
          return a.year.localeCompare(b.year);
        });

        setStudents(loadedStudents);
      } catch (err) {
        console.error("Error fetching students:", err);
        setError("Failed to load student data.");
      }
    };

    fetchStudents();
  }, []);

  // Handle system change
  const handleSystemChange = async (uid: string, newSystem: string) => {
    setUpdating(uid);
    try {
      const studentRef = doc(db, "students", uid);
      await updateDoc(studentRef, {
        system: newSystem,
      });

      // Update local state
      setStudents((prevStudents) =>
        prevStudents.map((student) =>
          student.uid === uid ? { ...student, system: newSystem } : student,
        ),
      );
    } catch (err) {
      console.error("Error updating system:", err);
      alert("Failed to update system. Please try again.");
    } finally {
      setUpdating(null);
    }
  };

  // group students by year
  const grouped: Record<string, StudentData[]> = {};
  for (const student of students) {
    if (!grouped[student.year]) {
      grouped[student.year] = [];
    }
    grouped[student.year].push(student);
  }

  // filter students by search input (name or phone)
  const filteredGrouped: Record<string, StudentData[]> = {};
  Object.keys(grouped).forEach((year) => {
    filteredGrouped[year] = grouped[year].filter((student) => {
      const fullName =
        `${student.firstName} ${student.secondName} ${student.thirdName} ${student.forthName}`.toLowerCase();
      return (
        fullName.includes(search.toLowerCase()) ||
        student.studentPhone.includes(search) ||
        student.fatherPhone.includes(search) ||
        student.motherPhone.includes(search)
      );
    });
  });

  if (loading) {
    return <Loading text="Verifying admin access..." />;
  }

  return (
    <div className="wrapper">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1>Registered Students</h1>

        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
        />
      </div>

      {error ? (
        <p className={styles.error}>{error}</p>
      ) : students.length > 0 ? (
        Object.keys(filteredGrouped).map((year) =>
          filteredGrouped[year].length > 0 ? (
            <div key={year} className={styles.yearBlock}>
              <h2>{year.toUpperCase()}</h2>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>System</th>
                    <th>Gender</th>
                    <th>Student Phone</th>
                    <th>Fathers Phone</th>
                    <th>Mothers Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGrouped[year].map((student, index) => (
                    <tr key={index}>
                      <td>
                        <Link
                          href={`/sadmins/students/profile?id=${student.uid}`}
                          className={styles.studentNameLink}
                        >
                          {student.firstName} {student.secondName}{" "}
                          {student.thirdName} {student.forthName}
                        </Link>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          {student.system}
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleSystemChange(student.uid, e.target.value);
                              }
                            }}
                            disabled={updating === student.uid}
                            className={styles.systemDropdown}
                          >
                            <option value="">Change</option>
                            {systemOptions
                              .filter((option) => option !== student.system)
                              .map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                          </select>
                        </div>
                      </td>
                      <td>{student.gender}</td>
                      <td>{student.studentPhone}</td>
                      <td>{student.fatherPhone}</td>
                      <td>{student.motherPhone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null,
        )
      ) : (
        <p>No students found.</p>
      )}
    </div>
  );
}
