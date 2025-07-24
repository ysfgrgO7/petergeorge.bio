"use client";
import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import styles from "./register.module.css";

export default function Register() {
  const auth = getAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    gender: "",
    email: "",
    password: "",
    confirmPassword: "",
    studentPhone: "",
    school: "",
    parentPhone1: "",
    parentPhone2: "",
    year: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const generateStudentCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    const studentCode = generateStudentCode();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      await addDoc(collection(db, "students"), {
        uid: user.uid,
        ...formData,
        studentCode,
        createdAt: new Date(),
      });

      router.push("/home");
    } catch (error) {
      console.error("Error:", error);
      alert("Registration failed. " + error.message);
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Split Student and Parent Info */}
        <div className={styles.splitContainer}>
          {/* Student Info Section */}
          <div className={styles.section}>
            <h3>Student Info</h3>
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              onChange={handleChange}
              required
            />

            <select name="gender" onChange={handleChange} required>
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>

            <input
              type="tel"
              name="studentPhone"
              placeholder="Student Phone Number"
              onChange={handleChange}
              required
            />

            <input
              type="text"
              name="schoolName"
              placeholder="School Name"
              onChange={handleChange}
              required
            />
            <select name="year" onChange={handleChange} required>
              <option value="">Select School Year</option>
              <option value="Year 1">
                1st Secondary (Integrated Sciences)
              </option>
              <option value="Year 3">3rd Secondary (Biology)</option>
            </select>
          </div>

          {/* Parent Info Section */}
          <div className={styles.section}>
            <h3>Parent Info</h3>
            <input
              type="tel"
              name="parentPhone1"
              placeholder="Parent 1 Phone Number"
              onChange={handleChange}
              required
            />

            <input
              type="tel"
              name="parentPhone2"
              placeholder="Parent 2 Phone Number"
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Sign-in Credentials Section */}
        <div className={styles.credentials}>
          <h3>Sign-in Credentials</h3>

          <input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit">Register</button>
      </form>
    </div>
  );
}
