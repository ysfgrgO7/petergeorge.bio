"use client";
import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

import { FirebaseError } from "firebase/app";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { useRouter } from "next/navigation";
import styles from "../styles.module.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const auth = getAuth();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/courses");
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  const getDeviceId = () => {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const userId = userCredential.user.uid;
      const userEmail = userCredential.user.email || "";

      // 1️⃣ Check if the user is an admin
      const adminRef = doc(db, "admins", userEmail);
      const adminSnap = await getDoc(adminRef);
      const maxDevices = adminSnap.exists() ? 6 : 2;

      // 2️⃣ Fetch student data
      const studentRef = doc(db, "students", userId);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) {
        await signOut(auth);
        throw new Error("Student data not found. Contact support.");
      }

      const studentData = studentSnap.data();
      const devices: string[] = studentData?.devices || [];
      const deviceId = getDeviceId();

      // 3️⃣ Device limit check
      if (!devices.includes(deviceId)) {
        if (devices.length >= maxDevices) {
          await signOut(auth);
          throw new Error("Device limit reached. Contact support.");
        }
        await updateDoc(studentRef, {
          devices: arrayUnion(deviceId),
        });
      }

      router.push("/");
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        setError(`Firebase error: ${err.message}`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2>Login</h2>
      New user? <a href="/register" style={{ color: "var(--blue)", textDecoration: "underline" }}>Register here</a>
      <br />
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setEmail(e.target.value)
          }
          required
        />

        <div className={styles.password}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
