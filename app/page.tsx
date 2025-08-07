import Image from "next/image";
import styles from "./page.module.css";
import { FaInstagram, FaFacebook, FaYoutube, FaTiktok } from "react-icons/fa";

export default function Home() {
  return (
    <div className={styles.page}>

      <h1> You bring the dream ... We bring the Way </h1>
      <div className={styles.buttonContainer}>
        <button className={styles.button}>
          Integrated Sciences
          <Image
            src="/science.svg"
            alt="Integrated Sciences"
            width={250}
            height={250}
          />
          First Secondary
        </button>
        <button className={styles.button}>
          Biology
          <Image src="/heart.svg" alt="Biology" width={250} height={250} />
          Third Secondary
        </button>
        <button className={styles.button}>
          Geology
          <Image src="/earth.svg" alt="Geology" width={250} height={250} />
          Third Secondary
        </button>
      </div>

      <div className={styles.socialMedia}>
        <FaFacebook className={styles.icon} />
        <FaInstagram className={styles.icon} />
        <FaYoutube className={styles.icon} />
        <FaTiktok className={styles.icon} />
      </div>

    </div>
  );
}
