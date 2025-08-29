"use client";

import Image from "next/image";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase"; // ensure db is exported in firebase.ts
import { doc, getDoc } from "firebase/firestore";

import { MdAppRegistration, MdLogin } from "react-icons/md";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentYear, setStudentYear] = useState<string | null>(null);

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);

        // Fetch student year from Firestore
        const studentRef = doc(db, "students", user.uid);
        const snap = await getDoc(studentRef);
        if (snap.exists()) {
          const data = snap.data();
          setStudentYear(data.year); // assuming you store { year: "year1" | "year3" }
        }
      } else {
        setIsLoggedIn(false);
        setStudentYear(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleButtonClick = (year: string) => {
    if (isLoggedIn) {
      router.push(`/courses?year=${year}`);
    } else {
      router.push(`/login`);
    }
  };

  // Define buttons with their years
  const buttons = [
    {
      year: "year1",
      title: "Integrated Sciences",
      label: "First Secondary",
      img: "/science.svg",
    },
    {
      year: "year3",
      title: "Biology",
      label: "Third Secondary",
      img: "/heart.svg",
    },
    {
      year: "year3",
      title: "Geology",
      label: "Third Secondary",
      img: "/earth.svg",
    },
  ];

  return (
    <>
      <div className="wrapper">
        <h1 style={{ textAlign: "center", marginBottom: "2rem" }}>
          You bring the dream ... We bring the Way
        </h1>
        {!isLoggedIn && (
          <div
            style={{
              textAlign: "center",
              marginBottom: "2rem",
              display: "flex",
              justifyContent: "center",
              gap: "1rem",
            }}
          >
            <button
              style={{
                fontSize: "1.1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onClick={() => router.push("/login")}
            >
              <MdLogin style={{ fontSize: "1.3rem" }} /> Login
            </button>
            <button
              style={{
                backgroundColor: "var(--fg)",
                color: "var(--bg)",
                fontSize: "1.1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onClick={() => router.push("/register")}
            >
              <MdAppRegistration style={{ fontSize: "1.3rem" }} /> Register
            </button>
          </div>
        )}
        <div className={styles.buttonContainer}>
          {buttons
            .filter((btn) => !isLoggedIn || btn.year === studentYear) // show only allowed year if logged in
            .map((btn) => (
              <button
                key={btn.title}
                className={styles.button}
                onClick={() => handleButtonClick(btn.year)}
              >
                <strong>{btn.title}</strong>
                <Image
                  src={btn.img}
                  alt={btn.title}
                  width={250}
                  height={250}
                  draggable={false}
                />
                {btn.label}
              </button>
            ))}
        </div>
      </div>
    </>
  );
}
