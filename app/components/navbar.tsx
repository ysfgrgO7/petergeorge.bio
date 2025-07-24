"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./components.module.css";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  MdHome,
  MdMenuBook,
  MdAdminPanelSettings,
  MdAppRegistration,
  MdLogin,
  MdLogout,
  MdMenu,
} from "react-icons/md";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <>
      {/* Topbar for mobile */}
      <div className={styles.topbar}>
        <MdMenu className={styles.hamburger} onClick={toggleSidebar} />
        <div className={styles.ToplogoContainer}>
          <Image
            src="/Logo.png"
            alt="LOGO"
            width={45}
            height={45}
            className={styles.logo}
          />
          <div className={styles.logo}>Master Biology</div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`${styles.navbar} ${sidebarOpen ? styles.open : ""}`}>
        <div className={styles.logoContainer}>
          <Image
            src="/Logo.png"
            alt="LOGO"
            width={70}
            height={70}
            className={styles.logo}
          />
          <div className={styles.logo}>Master Biology</div>
        </div>

        {isLoggedIn ? (
          <>
            <ul className={styles.links}>
              <li className={pathname === "/" ? styles.active : ""}>
                <Link href="/" onClick={toggleSidebar}>
                  <MdHome className={styles.icon} />
                  Home
                </Link>
              </li>

              <li className={pathname === "/courses" ? styles.active : ""}>
                <Link href="/courses" onClick={toggleSidebar}>
                  <MdMenuBook className={styles.icon} />
                  Courses
                </Link>
              </li>

              <li className={pathname === "/admin" ? styles.active : ""}>
                <Link href="/admin" onClick={toggleSidebar}>
                  <MdAdminPanelSettings className={styles.icon} />
                  Admin
                </Link>
              </li>
            </ul>

            <button onClick={handleLogout} className={styles.logout}>
              <MdLogout size={24} />
            </button>
          </>
        ) : (
          <ul className={styles.links}>
            <li className={pathname === "/register" ? styles.active : ""}>
              <Link href="/register" onClick={toggleSidebar}>
                <MdAppRegistration className={styles.icon} />
                Register
              </Link>
            </li>
            <li className={pathname === "/login" ? styles.active : ""}>
              <Link href="/login" onClick={toggleSidebar}>
                <MdLogin className={styles.icon} />
                Login
              </Link>
            </li>
          </ul>
        )}
      </aside>
    </>
  );
}
