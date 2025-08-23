"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./components.module.css";
import { usePathname, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  DocumentData,
} from "firebase/firestore";
import {
  MdHome,
  MdMenuBook,
  MdAdminPanelSettings,
  MdAppRegistration,
  MdLogin,
  MdLogout,
  MdMenu,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";
import { CgProfile } from "react-icons/cg";
import { GiProgression } from "react-icons/gi";

export default function Navbar({
  onCollapse,
  isCollapsed,
}: {
  onCollapse: (collapsed: boolean) => void;
  isCollapsed: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined" && window.innerWidth <= 768) {
        if (isCollapsed) onCollapse(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isCollapsed, onCollapse]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // ---- Helpers to resolve a display name from multiple possible locations ----
  const pickName = (data: DocumentData | undefined, user: User) => {
    const first =
      data?.firstName ??
      data?.givenName ??
      data?.name?.first ??
      data?.first ??
      "";
    const last =
      data?.secondName ??
      data?.lastName ??
      data?.familyName ??
      data?.surname ??
      data?.name?.last ??
      data?.last ??
      "";
    const full =
      data?.fullName ??
      data?.displayName ??
      data?.name ??
      (first || last ? [first, last].filter(Boolean).join(" ") : "");

    if (full) return String(full).trim();
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split("@")[0];
    return "";
  };

  const tryDoc = async (path: [string, string]) => {
    try {
      const snap = await getDoc(doc(db, path[0], path[1]));
      return snap.exists() ? snap.data() : undefined;
    } catch (e) {
      // Likely a permissions issue; just skip
      console.warn("Firestore read blocked for", path.join("/"));
      return undefined;
    }
  };

  const tryQuery = async (
    coll: string,
    field: "uid" | "email",
    value: string
  ) => {
    try {
      const q = query(collection(db, coll), where(field, "==", value));
      const res = await getDocs(q);
      if (!res.empty) return res.docs[0].data();
    } catch (e) {
      console.warn("Firestore query blocked for", coll, field);
    }
    return undefined;
  };

  const resolveDisplayName = async (user: User) => {
    // 1) Auth profile
    if (user.displayName && user.displayName.trim()) return user.displayName;

    // 2) users/{uid} -> users/{email}
    const fromUsersByUid = await tryDoc(["users", user.uid]);
    if (fromUsersByUid) return pickName(fromUsersByUid, user);

    if (user.email) {
      const fromUsersByEmail = await tryDoc(["users", user.email]);
      if (fromUsersByEmail) return pickName(fromUsersByEmail, user);
    }

    // 3) students/{uid} -> students/{email}
    const fromStudentsByUid = await tryDoc(["students", user.uid]);
    if (fromStudentsByUid) return pickName(fromStudentsByUid, user);

    if (user.email) {
      const fromStudentsByEmail = await tryDoc(["students", user.email]);
      if (fromStudentsByEmail) return pickName(fromStudentsByEmail, user);
    }

    // 4) Query users by fields if doc IDs are custom
    const byUidField = await tryQuery("users", "uid", user.uid);
    if (byUidField) return pickName(byUidField, user);

    if (user.email) {
      const byEmailField = await tryQuery("users", "email", user.email);
      if (byEmailField) return pickName(byEmailField, user);
    }

    // 5) Fallback to email prefix
    return user.email ? user.email.split("@")[0] : "";
  };

  // ---- Main auth listener ----
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoggedIn(!!user);

      if (!user) {
        setIsAdmin(false);
        setUserName("");
        return;
      }

      // Admin check (unchanged)
      if (user.email) {
        try {
          const adminSnap = await getDoc(doc(db, "admins", user.email));
          setIsAdmin(adminSnap.exists());
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }

      // Student name resolution
      try {
        const name = await resolveDisplayName(user);
        setUserName(name);
        // Debugging insight
        console.log("Resolved student name:", name);
      } catch (e) {
        console.error("Failed to resolve display name", e);
        setUserName("");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoggedIn(!!user);

      if (!user) {
        setIsSuperAdmin(false);
        setUserName("");
        return;
      }

      // Super Admin check
      if (user.email) {
        try {
          const adminSnap = await getDoc(doc(db, "superAdmins", user.email));
          setIsSuperAdmin(adminSnap.exists());
        } catch {
          setIsSuperAdmin(false);
        }
      } else {
        setIsSuperAdmin(false);
      }

      // Student name resolution
      try {
        const name = await resolveDisplayName(user);
        setUserName(name);
        // Debugging insight
        console.log("Resolved student name:", name);
      } catch (e) {
        console.error("Failed to resolve display name", e);
        setUserName("");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const toggleSidebar = () => setSidebarOpen((s) => !s);
  const toggleDesktopSidebar = () => onCollapse(!isCollapsed);

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
            draggable={false}
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
        <button
          className={styles.logoContainer}
          style={{
            backgroundColor: "transparent",
            color: "var(--white)",
            border: "none",
          }}
          onClick={() => router.push("/")}
          title="Home"
        >
          <Image
            src="/Logo.png"
            alt="LOGO"
            width={70}
            height={70}
            draggable={false}
            style={{ marginBottom: "1rem" }}
          />
          {!isCollapsed && <div className={styles.logo}>Master Biology</div>}
        </button>

        {isLoggedIn ? (
          <>
            <ul className={styles.links}>
              <li className={pathname === "/" ? styles.active : ""}>
                <Link href="/" onClick={toggleSidebar}>
                  <MdHome className={styles.icon} />
                  {!isCollapsed && <span>Home</span>}
                </Link>
              </li>

              <li className={pathname === "/courses" ? styles.active : ""}>
                <Link href="/courses" onClick={toggleSidebar}>
                  <MdMenuBook className={styles.icon} />
                  {!isCollapsed && <span>Courses</span>}
                </Link>
              </li>

              <li className={pathname === "/progress" ? styles.active : ""}>
                <Link href="/progress" onClick={toggleSidebar}>
                  <GiProgression className={styles.icon} />
                  {!isCollapsed && <span>Progress</span>}
                </Link>
              </li>

              {isAdmin && (
                <li className={pathname === "/admin" ? styles.active : ""}>
                  <Link href="/admin" onClick={toggleSidebar}>
                    <MdAdminPanelSettings className={styles.icon} />
                    {!isCollapsed && <span>Admin</span>}
                  </Link>
                </li>
              )}

              {isSuperAdmin && (
                <li className={pathname === "/students" ? styles.active : ""}>
                  <Link href="/students" onClick={toggleSidebar}>
                    <CgProfile className={styles.icon} />
                    {!isCollapsed && <span>Students</span>}
                  </Link>
                </li>
              )}
            </ul>

            {!isCollapsed && userName && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: "10px",
                  paddingBottom: "10px",
                  gap: "10px",
                }}
              >
                <CgProfile className={styles.icon} />
                {userName}
              </div>
            )}

            <button
              onClick={toggleDesktopSidebar}
              className={styles.collapseToggle}
              style={{
                gap: "9px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--white)",
              }}
              aria-label="Toggle sidebar"
              title="Toggle sidebar"
            >
              {isCollapsed ? "" : <strong>Collapse</strong>}
              {isCollapsed ? (
                <MdChevronRight size={24} />
              ) : (
                <MdChevronLeft size={24} />
              )}
            </button>

            <button
              onClick={handleLogout}
              style={{ gap: "9px" }}
              className={styles.logout}
              title="Log out"
            >
              {isCollapsed ? "" : <strong>Log Out</strong>}
              <MdLogout size={24} />
            </button>
          </>
        ) : (
          <ul className={styles.links}>
            <li className={pathname === "/register" ? styles.active : ""}>
              <Link href="/register" onClick={toggleSidebar}>
                <MdAppRegistration className={styles.icon} />
                {!isCollapsed && <span>Register</span>}
              </Link>
            </li>
            <li className={pathname === "/login" ? styles.active : ""}>
              <Link href="/login" onClick={toggleSidebar}>
                <MdLogin className={styles.icon} />
                {!isCollapsed && <span>Login</span>}
              </Link>
            </li>
          </ul>
        )}
      </aside>
    </>
  );
}
