"use client";
import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { setDoc, doc } from "firebase/firestore";
import styles from "../styles.module.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { onAuthStateChanged } from "firebase/auth";

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
  fatherPhone: string;
  motherPhone: string;
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
  fatherPhone?: string;
  motherPhone?: string;
  year?: string;
}

export default function Register() {
  const auth = getAuth();
  const router = useRouter();
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/courses");
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

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
    fatherPhone: "",
    motherPhone: "",
    year: "",
  });

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

  const isValidPhone = (phone: string) => /^01[0-9]{9}$/.test(phone);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: FormErrors = {};

    const {
      password,
      confirmPassword,
      studentPhone,
      fatherPhone,
      motherPhone,
    } = formData;

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    // Check phone uniqueness
    const phones = [studentPhone, fatherPhone, motherPhone].filter(Boolean);
    const uniquePhones = new Set(phones);
    if (uniquePhones.size !== phones.length) {
      if (
        studentPhone &&
        (studentPhone === fatherPhone || studentPhone === motherPhone)
      ) {
        newErrors.studentPhone = "Student phone must be unique.";
      }
      if (
        fatherPhone &&
        (fatherPhone === motherPhone || fatherPhone === studentPhone)
      ) {
        newErrors.fatherPhone = "Father phone must be unique.";
      }
      if (
        motherPhone &&
        (motherPhone === fatherPhone || motherPhone === studentPhone)
      ) {
        newErrors.motherPhone = "Mother phone must be unique.";
      }
    }

    // Validate phone format
    (
      ["studentPhone", "fatherPhone", "motherPhone"] as Array<keyof FormData>
    ).forEach((field) => {
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

      // Use UID as document ID for consistent login lookups
      await setDoc(doc(db, "students", user.uid), {
        uid: user.uid,
        ...formData,
        studentCode,
        logins: [new Date().toISOString()],
        createdAt: new Date().toISOString(),
      });

      // Optional: store locally for immediate use
      localStorage.setItem("studentCode", studentCode);

      await auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      alert("Registration failed. " + message);
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
              <option value="year1">1st Secondary (Integrated Sciences)</option>
              <option value="year3">3rd Secondary (Biology/Geology)</option>
            </select>
          </div>
          <div className={styles.section}>
            <h3>Parent Info</h3>
            {errors.fatherPhone && (
              <p className={styles.errorText}>{errors.fatherPhone}</p>
            )}
            <input
              type="tel"
              name="fatherPhone"
              placeholder="Father Phone Number"
              onChange={handleChange}
              required
            />
            {errors.motherPhone && (
              <p className={styles.errorText}>{errors.motherPhone}</p>
            )}
            <input
              type="tel"
              name="motherPhone"
              placeholder="Mother Phone Number"
              onChange={handleChange}
              required
            />
          </div>
        </div>

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

          <div className={styles.password}>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              onChange={handleChange}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

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
