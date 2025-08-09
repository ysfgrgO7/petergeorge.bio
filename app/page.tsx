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
          Integrated Sciences
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
          Biology
          <Image src="/heart.svg" alt="Biology" width={250} height={250} />
          Third Secondary
        </button>
        <button
          className={styles.button}
          onClick={() => handleButtonClick("year3")}
        >
          Geology
          <Image src="/earth.svg" alt="Geology" width={250} height={250} />
          Third Secondary
        </button>
      </div>

      <div className={styles.socialMedia}>
        <a
          href="https://www.facebook.com/your-facebook-page"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaFacebook className={styles.icon} />
        </a>
        <a
          href="https://www.instagram.com/your-instagram-page"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaInstagram className={styles.icon} />
        </a>
        <a
          href="https://www.youtube.com/your-youtube-channel"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaYoutube className={styles.icon} />
        </a>
        <a
          href="https://www.tiktok.com/@your-tiktok-page"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaTiktok className={styles.icon} />
        </a>
      </div>
    </div>
  );
}
