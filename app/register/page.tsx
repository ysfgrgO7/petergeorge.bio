"use client";
import React, { useState, ChangeEvent, FormEvent } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { setDoc, doc } from "firebase/firestore"; // Removed unused imports: collection, addDoc
import styles from "../styles.module.css";

// Define interfaces for form data and errors to provide strong typing
interface FormData {
  firstName: string;
  secondName: string;
  thirdName: string;
  forthName: string;
  gender: string;
  email: string;
  password: string;
  confirmPassword: string;
  studentPhone: string;
  school: string;
  parentPhone1: string;
  parentPhone2: string;
  year: string;
}

interface FormErrors {
  firstName?: string;
  secondName?: string;
  thirdName?: string;
  forthName?: string;
  gender?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  studentPhone?: string;
  school?: string;
  parentPhone1?: string;
  parentPhone2?: string;
  year?: string;
}

export default function Register() {
  const auth = getAuth();
  const router = useRouter();
  // Initialize errors state with the defined FormErrors interface
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState<FormData>({
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

  // Explicitly type the event parameter 'e'
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const generateStudentCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Explicitly type the event parameter 'e'
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Initialize newErrors with the defined FormErrors interface
    const newErrors: FormErrors = {};

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

    // Phone uniqueness validation
    const phones = [studentPhone, parentPhone1, parentPhone2].filter(Boolean);
    const uniquePhones = new Set(phones);
    if (uniquePhones.size !== phones.length) {
      if (
        studentPhone &&
        (studentPhone === parentPhone1 || studentPhone === parentPhone2)
      )
        newErrors.studentPhone = "Student phone must be unique.";

      if (
        parentPhone1 &&
        (parentPhone1 === parentPhone2 || parentPhone1 === studentPhone)
      )
        newErrors.parentPhone1 = "Parent 1 phone must be unique.";

      if (
        parentPhone2 &&
        (parentPhone2 === parentPhone1 || parentPhone2 === studentPhone)
      )
        newErrors.parentPhone2 = "Parent 2 phone must be unique.";
    }

    // Validate phone format (Egyptian)
    const isValidPhone = (phone: string) => /^01[0-9]{9}$/.test(phone);
    (
      ["studentPhone", "parentPhone1", "parentPhone2"] as Array<keyof FormData>
    ).forEach((field) => {
      const phone = formData[field];
      if (typeof phone === "string" && phone && !isValidPhone(phone)) {
        newErrors[field] = "Enter a valid 11-digit Egyptian number.";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({}); // Clear errors if validation passes
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
    } catch (error: unknown) {
      // Explicitly type error as unknown
      console.error("Error:", error);
      // Safely access error message by asserting its type
      alert("Registration failed. " + (error as Error).message);
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
              <option value="year1">
                1st Secondary (Integrated Sciences)
              </option>
              <option value="year3">3rd Secondary (Biology)</option>
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
