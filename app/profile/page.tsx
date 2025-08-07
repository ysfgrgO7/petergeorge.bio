"use client";
import styles from "./profile.module.css";
export default function Profile() {
  return (
    <div className={styles.wrapper}>
      <h1>Profile Page</h1>
      <hr />
      <h1>Your Info</h1>
      <li>Name: John Doe</li>
      <li>Email: john.doe@example.com</li>
      <li>Location: Earth</li>
    </div>
  );
}
