"use client";
import React, { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import styles from "./register.module.css";

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: "",
    secondName: "",
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
      await addDoc(collection(db, "students"), {
        ...formData,
        studentCode,
        createdAt: new Date(),
      });
      alert("Registration successful!");
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Failed to register.");
    }
  };

  return (
    <div className={styles.container}>
      <h1>Student Registration</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="secondName"
          placeholder="Second Name"
          onChange={handleChange}
          required
        />

        <select name="gender" onChange={handleChange} required>
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

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

        <select name="year" onChange={handleChange} required>
          <option value="">Select School Year</option>
          <option value="Year 1">1st Secondary (Integrated Scinces)</option>
          <option value="Year 3">3rd Secondary (Biology)</option>
        </select>
        <button type="submit"> Register </button>
      </form>
    </div>
  );
}
