"use client";

import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase"; // ensure db is exported in firebase.ts
import { useTheme } from "@/app/components/ThemeProvider";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  DocumentData,
} from "firebase/firestore";
import { MdAppRegistration, MdLogin } from "react-icons/md";
import { LiaFlaskSolid } from "react-icons/lia";
import { IoEarthOutline } from "react-icons/io5";
import { PiDnaBold } from "react-icons/pi";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentYear, setStudentYear] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const { isDef, isHalloween, isXmas, isRamadan } = useTheme();

  const pickName = (data: DocumentData | undefined, user: User) => {
    const first =
      data?.firstName ??
      data?.givenName ??
      data?.name?.first ??
      data?.first ??
      "";
    const full =
      data?.fullName ??
      data?.displayName ??
      data?.name ??
      (first ? [first].filter(Boolean).join(" ") : "");

    if (full) return String(full).trim();
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split("@")[0];
    return "";
  };

  const tryDoc = async (path: [string, string]) => {
    try {
      const snap = await getDoc(doc(db, path[0], path[1]));
      return snap.exists() ? snap.data() : undefined;
    } catch (e) {
      console.warn("Firestore read blocked for", path.join("/"));
      return undefined;
    }
  };

  const tryQuery = async (
    coll: string,
    field: "uid" | "email",
    value: string
  ) => {
    try {
      const q = query(collection(db, coll), where(field, "==", value));
      const res = await getDocs(q);
      if (!res.empty) return res.docs[0].data();
    } catch (e) {
      console.warn("Firestore query blocked for", coll, field);
    }
    return undefined;
  };

  const resolveDisplayName = async (user: User) => {
    if (user.displayName && user.displayName.trim()) return user.displayName;

    const fromUsersByUid = await tryDoc(["users", user.uid]);
    if (fromUsersByUid) return pickName(fromUsersByUid, user);

    if (user.email) {
      const fromUsersByEmail = await tryDoc(["users", user.email]);
      if (fromUsersByEmail) return pickName(fromUsersByEmail, user);
    }

    const fromStudentsByUid = await tryDoc(["students", user.uid]);
    if (fromStudentsByUid) return pickName(fromStudentsByUid, user);

    if (user.email) {
      const fromStudentsByEmail = await tryDoc(["students", user.email]);
      if (fromStudentsByEmail) return pickName(fromStudentsByEmail, user);
    }
    const byUidField = await tryQuery("users", "uid", user.uid);
    if (byUidField) return pickName(byUidField, user);

    if (user.email) {
      const byEmailField = await tryQuery("users", "email", user.email);
      if (byEmailField) return pickName(byEmailField, user);
    }
    return user.email ? user.email.split("@")[0] : "";
  };

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

      if (!user) {
        setUserName("");
        return;
      }

      try {
        const name = await resolveDisplayName(user);
        setUserName(name);
        console.log("Resolved student name:", name);
      } catch (e) {
        console.error("Failed to resolve display name", e);
        setUserName("");
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
      icon: LiaFlaskSolid,
    },
    {
      year: "year3",
      title: "Biology",
      label: "Third Secondary",
      icon: PiDnaBold,
    },
    {
      year: "year3",
      title: "Geology",
      label: "Third Secondary",
      icon: IoEarthOutline,
    },
  ];

  return (
    <>
      {/* <div className={styles.bg}> */}
      <div className="wrapper">
        <h1 className={styles.title}>
          You bring the dream ... We bring the Way
        </h1>

        {!isLoggedIn && (
          <div className={styles.signButtons}>
            <button
              style={{
                fontSize: "1.1rem",
                color: "var(--white)",
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
                background: "rgba(47, 56, 67, 0.4)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                color: "var(--white)",
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

        {isLoggedIn && (
          <h2 style={{ textAlign: "center", marginBottom: "2rem" }}>
            Welcome Back, {userName}👋
          </h2>
        )}
        <div className={styles.buttonContainer}>
          {buttons
            .filter((btn) => !isLoggedIn || btn.year === studentYear)
            .map((btn) => {
              const Icon = btn.icon; // ✅ assign component reference
              return (
                <button
                  key={btn.title}
                  onClick={() => handleButtonClick(btn.year)}
                  className={styles.courseButton}
                >
                  <strong style={{ fontSize: "2rem" }}>{btn.title}</strong>
                  {isDef && <Icon style={{ fontSize: "10rem" }} />}

                  {isHalloween && (
                    <span style={{ fontSize: "10rem" }}>
                      <Image
                        src="/hallo.svg"
                        alt="Halloween"
                        width={140}
                        height={140}
                      />
                    </span>
                  )}

                  {isXmas && (
                    <span style={{ fontSize: "10rem" }}>
                      <Image
                        src="/xmasHat.png"
                        alt="Christmas"
                        width={155}
                        height={140}
                      />
                    </span>
                  )}
                  {btn.label}
                </button>
              );
            })}
        </div>

        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          {isHalloween && <h2>🎃 Spooky Halloween!</h2>}
          {isXmas && <h2>🎄 Merry Christmas!</h2>}
          {isRamadan && <h2>🌙 Ramadan Mubarak!</h2>}
        </div>
      </div>
    </>
  );
}
