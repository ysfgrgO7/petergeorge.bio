"use client";

import { useEffect, useState } from "react";
import styles from "./components.module.css";
import { FaInstagram, FaFacebook, FaYoutube, FaTiktok } from "react-icons/fa";
import { MdSunny } from "react-icons/md";
import { IoLogoWhatsapp } from "react-icons/io";
import { FaMoon } from "react-icons/fa";

export default function Footer() {
  useEffect(() => {
    // Check for a saved theme in localStorage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      // Set a default theme
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);
  const [theme, setTheme] = useState("light");

  const toggleTheme = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };
  return (
    <footer className={styles.footerContainer}>
      <div className={styles.footer}>
        <p
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <a
            style={{ display: "flex", alignItems: "center" }}
            href="https://wa.me/201005679461"
          >
            <IoLogoWhatsapp style={{ marginRight: "5px" }} />
            <strong>Click for Support</strong>
          </a>
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div className={styles.socialMedia}>
            <a
              href="https://www.facebook.com/share/19ooXGtmA1/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaFacebook className={styles.icon} />
            </a>
            <a
              href="https://www.instagram.com/master__biology?igsh=MW5vY2JzOGNqbW5jbg%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaInstagram className={styles.icon} />
            </a>
            <a
              href="https://youtube.com/@masterbiology2018?si=Or6xu8QocRjF4OFD"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaYoutube className={styles.icon} />
            </a>
            <a
              href="https://www.tiktok.com/@master.biology?_t=ZS-8yk6O4EtrV3&_r=1"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTiktok className={styles.icon} />
            </a>
          </div>

          <p>© 2025 Master Biology</p>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div className={styles.toggleWrapper}>
            <button
              onClick={() => toggleTheme("light")}
              className={`${styles.toggleBtn} ${
                theme === "light" ? styles.active : ""
              }`}
            >
              <MdSunny />
            </button>
            <button
              onClick={() => toggleTheme("dark")}
              className={`${styles.toggleBtn} ${
                theme === "dark" ? styles.active : ""
              }`}
            >
              <FaMoon />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
