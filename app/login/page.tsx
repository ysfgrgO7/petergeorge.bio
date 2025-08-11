"use client";
import React, { useState, ChangeEvent, FormEvent } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { useRouter } from "next/navigation";
import styles from "../styles.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = getAuth();

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

      const studentRef = doc(db, "students", userId);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) {
        throw new Error("Student data not found. Contact support.");
      }

      const studentData = studentSnap.data();
      const devices: string[] = studentData?.devices || [];
      const deviceId = getDeviceId();

      if (!devices.includes(deviceId)) {
        if (devices.length >= 2) {
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
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setPassword(e.target.value)
          }
          required
        />
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
