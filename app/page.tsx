"use client";

import Image from "next/image";
import styles from "./page.module.css";
import { FaInstagram, FaFacebook, FaYoutube, FaTiktok } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if a student code exists in local storage
    const studentCode = localStorage.getItem("studentCode");
    if (studentCode) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleButtonClick = (year: string) => {
    if (isLoggedIn) {
      // Redirect to courses page if logged in
      router.push(`/courses`);
    } else {
      // Redirect to login page if not logged in
      router.push(`/login`);
    }
  };

  return (
    <div className={styles.page}>
      <h1>You bring the dream ... We bring the Way</h1>
      <div className={styles.buttonContainer}>
        <button
          className={styles.button}
          onClick={() => handleButtonClick("year1")}
        >
          <strong>Integrated Sciences</strong>
          <Image
            src="/science.svg"
            alt="Integrated Sciences"
            width={250}
            height={250}
          />
          First Secondary
        </button>
        <button
          className={styles.button}
          onClick={() => handleButtonClick("year3")}
        >
          <strong>Biology</strong>
          <Image src="/heart.svg" alt="Biology" width={250} height={250} />
          Third Secondary
        </button>
        <button
          className={styles.button}
          onClick={() => handleButtonClick("year3")}
        >
          <strong>Geology</strong>
          <Image src="/earth.svg" alt="Geology" width={250} height={250} />
          Third Secondary
        </button>
      </div>
    </div>
  );
}
