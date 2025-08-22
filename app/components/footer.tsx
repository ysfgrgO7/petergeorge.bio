"use client";

import styles from "./components.module.css";
import { FaInstagram, FaFacebook, FaYoutube, FaTiktok } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className={styles.footerContainer}>
      <div className={styles.footer}>
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
        © 2025 Master Biology
      </div>
    </footer>
  );
}
