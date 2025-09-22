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
      // Only redirect if user is already authenticated and we're not in the middle of a login process
      if (user && !loading) {
        router.push("/courses");
      }
    });

    return () => unsubscribe();
  }, [auth, router, loading]);

  const getDeviceId = () => {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
  };

  // Function to convert Firebase errors to user-friendly messages
  const getFirebaseErrorMessage = (error: FirebaseError): string => {
    switch (error.code) {
      case "auth/user-not-found":
        return "No account found with this email address. Please check your email or register for a new account.";
      case "auth/wrong-password":
        return "Incorrect password. Please check your password and try again.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/user-disabled":
        return "This account has been disabled. Please contact support for assistance.";
      case "auth/too-many-requests":
        return "Too many failed login attempts. Please try again later or reset your password.";
      case "auth/network-request-failed":
        return "Network error. Please check your internet connection and try again.";
      case "auth/invalid-credential":
        return "Invalid email or password. Please check your credentials and try again.";
      case "auth/missing-password":
        return "Please enter your password.";
      case "auth/weak-password":
        return "Password is too weak. Please use a stronger password.";
      default:
        return "Login failed. Please try again or contact support if the problem persists.";
    }
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
        throw new Error(
          "Your account is not properly set up. Please contact support to complete your registration."
        );
      }

      const studentData = studentSnap.data();
      const devices: string[] = studentData?.devices || [];
      const deviceId = getDeviceId();

      // 3️⃣ Device limit check with better error message
      if (!devices.includes(deviceId)) {
        if (devices.length >= maxDevices) {
          await signOut(auth);
          const deviceType = adminSnap.exists() ? "admin" : "student";
          const maxDeviceText = adminSnap.exists() ? "6 devices" : "2 devices";
          throw new Error(
            `Device limit reached! As a ${deviceType}, you can only use this account on ${maxDeviceText}. Please contact support to manage your devices.`
          );
        }

        // Add the new device
        await updateDoc(studentRef, {
          devices: arrayUnion(deviceId),
        });
      }

      // If device limit check passes, then redirect
      router.push("/");
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        setError(getFirebaseErrorMessage(err));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2>Login</h2>
      New user?{" "}
      <a
        href="/register"
        style={{
          padding: "4px 6px",
          borderRadius: "var(--border-radius)",
          backgroundColor: "var(--white)",
          color: "var(--blue)",
          textDecoration: "underline",
        }}
      >
        Register here
      </a>
      <form
        style={{ marginTop: "0.6rem" }}
        onSubmit={handleSubmit}
        className={styles.form}
      >
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
