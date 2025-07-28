"use client";
import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, setDoc, doc } from "firebase/firestore";
import styles from "../styles.module.css";

export default function Register() {
  const auth = getAuth();
  const router = useRouter();
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    firstName: "",
    secondName: "",
    thirdName: "",
    forthName: "",
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
    const newErrors = {};

    const {
      password,
      confirmPassword,
      studentPhone,
      parentPhone1,
      parentPhone2,
    } = formData;

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    // Phone uniqueness
    const phones = [studentPhone, parentPhone1, parentPhone2].filter(Boolean);
    const uniquePhones = new Set(phones);
    if (uniquePhones.size !== phones.length) {
      if (studentPhone === parentPhone1 || studentPhone === parentPhone2)
        newErrors.studentPhone = "Student phone must be unique.";

      if (parentPhone1 === parentPhone2 || parentPhone1 === studentPhone)
        newErrors.parentPhone1 = "Parent 1 phone must be unique.";

      if (parentPhone2 === parentPhone1 || parentPhone2 === studentPhone)
        newErrors.parentPhone2 = "Parent 2 phone must be unique.";
    }

    // OPTIONAL: Validate phone format (Egyptian)
    const isValidPhone = (phone) => /^01[0-9]{9}$/.test(phone);
    ["studentPhone", "parentPhone1", "parentPhone2"].forEach((field) => {
      const phone = formData[field];
      if (phone && !isValidPhone(phone)) {
        newErrors[field] = "Enter a valid 11-digit Egyptian number.";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const studentCode = generateStudentCode();

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "students", studentCode), {
        uid: user.uid,
        ...formData,
        studentCode,
        createdAt: new Date(),
      });

      // save the code in localstorage
      localStorage.setItem("studentCode", studentCode);

      router.push("/home");
    } catch (error) {
      console.error("Error:", error);
      alert("Registration failed. " + error.message);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Register</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.splitContainer}>
          <div className={styles.section}>
            <h3>Student Info</h3>
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
            <input
              type="text"
              name="thirdName"
              placeholder="Third Name"
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="forthName"
              placeholder="Fourth Name"
              onChange={handleChange}
              required
            />
            <select name="gender" onChange={handleChange} required>
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            {errors.studentPhone && (
              <p className={styles.errorText}>{errors.studentPhone}</p>
            )}
            <input
              type="tel"
              name="studentPhone"
              placeholder="Student Phone Number"
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="school"
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
          <div className={styles.section}>
            <h3>Parent Info</h3>
            {errors.parentPhone1 && (
              <p className={styles.errorText}>{errors.parentPhone1}</p>
            )}
            <input
              type="tel"
              name="parentPhone1"
              placeholder="Parent 1 Phone Number"
              onChange={handleChange}
              required
            />
            {errors.parentPhone2 && (
              <p className={styles.errorText}>{errors.parentPhone2}</p>
            )}
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
          {errors.email && <p className={styles.errorText}>{errors.email}</p>}
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
          {errors.confirmPassword && (
            <p className={styles.errorText}>{errors.confirmPassword}</p>
          )}
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
