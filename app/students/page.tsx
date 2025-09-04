"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import styles from "./students.module.css";

interface StudentData {
  uid: string; // Added uid to identify the student
  firstName: string;
  secondName: string;
  thirdName: string;
  forthName: string;
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
              uid: doc.id, // Use document ID as uid
              firstName: data.firstName || "",
              secondName: data.secondName || "",
              thirdName: data.thirdName || "",
              forthName: data.forthName || "",
              studentPhone: data.studentPhone || "",
              fatherPhone: data.fatherPhone || "",
              motherPhone: data.motherPhone || "",
              year: data.year || "Unknown",
              gender: data.gender || "N/A",
            };
          }
        );

        // sort by year then by name
        loadedStudents.sort((a, b) => {
          if (a.year === b.year) {
            return `${a.firstName} ${a.secondName}`.localeCompare(
              `${b.firstName} ${b.secondName}`
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
                          href={`/students/profile?id=${student.uid}`}
                          className={styles.studentNameLink}
                        >
                          {student.firstName} {student.secondName}{" "}
                          {student.thirdName} {student.forthName}
                        </Link>
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
          ) : null
        )
      ) : (
        <p>No students found.</p>
      )}
    </div>
  );
}
