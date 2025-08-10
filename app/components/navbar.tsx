"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./components.module.css";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { FaWallet } from "react-icons/fa";
import {
  MdHome,
  MdMenuBook,
  MdAdminPanelSettings,
  MdAppRegistration,
  MdLogin,
  MdLogout,
  MdMenu,
  MdChevronLeft, // Icon for collapsing
  MdChevronRight, // Icon for expanding
} from "react-icons/md";

// The Navbar now receives the collapsed state from the parent
export default function Navbar({
  onCollapse,
  isCollapsed, // Add this prop to receive the collapsed state
}: {
  onCollapse: (collapsed: boolean) => void;
  isCollapsed: boolean; // Add this prop type
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        // Only set the parent's state if we are transitioning to a mobile view
        if (isCollapsed) {
          onCollapse(false);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isCollapsed, onCollapse]); // Add isCollapsed and onCollapse to the dependency array

  useEffect(() => {
    setSidebarOpen(false); // Close sidebar on route change
  }, [pathname]);

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

  // Toggles the desktop/tablet sidebar collapse
  const toggleDesktopSidebar = () => {
    // Call the parent's state setter directly
    onCollapse(!isCollapsed);
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
      <aside
        className={`${styles.navbar}
              ${sidebarOpen ? styles.open : ""}
              ${
                isCollapsed &&
                typeof window !== "undefined" &&
                window.innerWidth > 768
                  ? styles.collapsed
                  : ""
              }`}
      >
        <div className={styles.logoContainer}>
          <Image
            src="/Logo.png"
            alt="LOGO"
            width={70}
            height={70}
            style={{ marginBottom: "1rem" }}
          />
          {!isCollapsed && <div className={styles.logo}>Master Biology</div>}
        </div>

        {isLoggedIn ? (
          <>
            <ul className={styles.links}>
              <li className={pathname === "/" ? styles.active : ""}>
                <Link href="/" onClick={toggleSidebar}>
                  {" "}
                  {/* Keep mobile toggle */}
                  <MdHome className={styles.icon} />
                  {!isCollapsed && <span>Home</span>}{" "}
                  {/* Conditionally show text */}
                </Link>
              </li>

              <li className={pathname === "/courses" ? styles.active : ""}>
                <Link href="/courses" onClick={toggleSidebar}>
                  <MdMenuBook className={styles.icon} />
                  {!isCollapsed && <span>Courses</span>}{" "}
                  {/* Conditionally show text */}
                </Link>
              </li>

              <li className={pathname === "/payment" ? styles.active : ""}>
                <Link href="/" onClick={toggleSidebar}>
                  <FaWallet className={styles.icon} />
                  {!isCollapsed && <span>Payment</span>}{" "}
                </Link>
              </li>

              <li className={pathname === "/admin" ? styles.active : ""}>
                <Link href="/admin" onClick={toggleSidebar}>
                  <MdAdminPanelSettings className={styles.icon} />
                  {!isCollapsed && <span>Admin</span>}{" "}
                  {/* Conditionally show text */}
                </Link>
              </li>
            </ul>
            <button
              onClick={toggleDesktopSidebar}
              className={styles.collapseToggle}
            >
              {isCollapsed ? (
                <MdChevronRight size={24} />
              ) : (
                <MdChevronLeft size={24} />
              )}
            </button>
            <button onClick={handleLogout} className={styles.logout}>
              <MdLogout size={24} />
            </button>
          </>
        ) : (
          <ul className={styles.links}>
            <li className={pathname === "/register" ? styles.active : ""}>
              <Link href="/register" onClick={toggleSidebar}>
                <MdAppRegistration className={styles.icon} />
                {!isCollapsed && <span>Register</span>}{" "}
                {/* Conditionally show text */}
              </Link>
            </li>
            <li className={pathname === "/login" ? styles.active : ""}>
              <Link href="/login" onClick={toggleSidebar}>
                <MdLogin className={styles.icon} />
                {!isCollapsed && <span>Login</span>}{" "}
                {/* Conditionally show text */}
              </Link>
            </li>
          </ul>
        )}
      </aside>
    </>
  );
}
