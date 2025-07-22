"use client";

import Link from "next/link";
import styles from "./components.module.css";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Watch for auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>BioCourse</div>
      <ul className={styles.links}>
        {isLoggedIn ? (
          <>
            <li className={pathname === "/home" ? styles.active : ""}>
              <Link href="/home">Home</Link>
            </li>
            <li>
              <button onClick={handleLogout} className={styles.logout}>
                Logout
              </button>
            </li>
          </>
        ) : (
          <>
            <li className={pathname === "/register" ? styles.active : ""}>
              <Link href="/register">Register</Link>
            </li>
            <li className={pathname === "/login" ? styles.active : ""}>
              <Link href="/login">Login</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
