"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { RiAdminFill } from "react-icons/ri";
import { VscAccount } from "react-icons/vsc";
import { MdColorLens } from "react-icons/md";

interface NavigationButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  text: string;
  backgroundColor: string;
}

const NavigationCard: React.FC<NavigationButtonProps> = ({
  onClick,
  icon,
  text,
  backgroundColor,
}) => (
  <button
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      backgroundColor,
      color: "var(--white)",
      fontSize: "2rem",
      padding: "1rem 2rem",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "transform 0.2s ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-2px)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
    }}
  >
    {icon} {text}
  </button>
);

export default function SuperAdmins() {
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  const [updatingTheme, setUpdatingTheme] = useState(false);
  const [themeMessage, setThemeMessage] = useState<string | null>(null);

  const themes = [
    { value: "default", label: "Default" },
    { value: "halloween", label: "Halloween" },
    { value: "christmas", label: "Christmas" },
    { value: "ramadan", label: "Ramadan" },
  ];

  // Load current theme from Firebase
  const loadCurrentTheme = async () => {
    try {
      const themeDocRef = doc(db, "siteSettings", "theme");
      const themeDocSnap = await getDoc(themeDocRef);

      if (themeDocSnap.exists()) {
        const themeData = themeDocSnap.data();
        setCurrentTheme(themeData.theme || "default");
      } else {
        // If document doesn't exist, create it with default theme
        await setDoc(themeDocRef, { theme: "default" });
        setCurrentTheme("default");
      }
    } catch (err) {
      console.error("Error loading theme:", err);
    }
  };

  // Handle theme change
  const handleThemeChange = async (selectedTheme: string) => {
    setUpdatingTheme(true);
    setThemeMessage(null);

    try {
      const themeDocRef = doc(db, "siteSettings", "theme");
      await setDoc(themeDocRef, { theme: selectedTheme }, { merge: true });

      setCurrentTheme(selectedTheme);
      setThemeMessage(
        `Theme updated to ${
          themes.find((t) => t.value === selectedTheme)?.label
        } successfully!`,
      );

      // Clear success message after 3 seconds
      setTimeout(() => {
        setThemeMessage(null);
      }, 3000);
    } catch (err) {
      console.error("Error updating theme:", err);
      setThemeMessage("Error updating theme. Please try again.");

      // Clear error message after 3 seconds
      setTimeout(() => {
        setThemeMessage(null);
      }, 3000);
    } finally {
      setUpdatingTheme(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user?.email) {
          const adminDocRef = doc(db, "superAdmins", user.email);
          const adminDocSnap = await getDoc(adminDocRef);

          if (adminDocSnap.exists()) {
            setIsSuperAdmin(true);
            // Load current theme after confirming admin access
            await loadCurrentTheme();
          } else {
            setError("Access denied: Super Admin privileges required");
            setTimeout(() => router.push("/"), 200);
          }
        } else {
          setError("Authentication required");
          setTimeout(() => router.push("/"), 200);
        }
      } catch (err) {
        console.error("Error checking admin status:", err);
        setError("Error verifying admin status");
        setTimeout(() => router.push("/"), 200);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="wrapper" style={{ textAlign: "center", padding: "2rem" }}>
        <div style={{ fontSize: "1.5rem", color: "var(--dark)" }}>
          Verifying super admin access...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrapper" style={{ textAlign: "center", padding: "2rem" }}>
        <div
          style={{
            fontSize: "1.5rem",
            color: "var(--red, #dc3545)",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
        <div style={{ color: "var(--gray, #6c757d)" }}>
          Redirecting to home page...
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null; // This shouldn't normally be reached due to redirects
  }

  return (
    <div className="wrapper">
      <header style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1
          style={{
            marginBottom: "0.5rem",
            fontSize: "2.5rem",
          }}
        >
          Super Admin Dashboard
        </h1>
        <p
          style={{
            fontSize: "1.1rem",
          }}
        >
          Manage students and lectures from here
        </p>
      </header>

      {/* Theme Selector Section */}
      <div
        style={{
          backgroundColor: "var(--darkgrey)",
          backdropFilter: "blur(2px)",
          padding: "1.5rem",
          borderRadius: "8px",
          marginBottom: "3rem",
          maxWidth: "400px",
          margin: "0 auto 3rem auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
            fontSize: "1.2rem",
            fontWeight: "600",
            color: "var(--fg)",
          }}
        >
          <MdColorLens /> Set Website Theme
        </div>

        <select
          value={currentTheme}
          onChange={(e) => handleThemeChange(e.target.value)}
          disabled={updatingTheme}
          style={{
            width: "100%",
            padding: "0.75rem",
            fontSize: "1rem",
            cursor: updatingTheme ? "not-allowed" : "pointer",
            opacity: updatingTheme ? 0.7 : 1,
          }}
        >
          {themes.map((theme) => (
            <option key={theme.value} value={theme.value}>
              {theme.label}
            </option>
          ))}
        </select>

        {updatingTheme && (
          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.9rem",
              color: "var(--blue, #007bff)",
            }}
          >
            Updating theme...
          </div>
        )}

        {themeMessage && (
          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.9rem",
              color: themeMessage.includes("Error")
                ? "var(--red, #dc3545)"
                : "var(--green, #28a745)",
              fontWeight: "500",
            }}
          >
            {themeMessage}
          </div>
        )}
      </div>

      <nav
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "2.5rem",
          flexWrap: "wrap",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <NavigationCard
          onClick={() => router.push("/sadmins/students")}
          icon={<VscAccount />}
          text="Manage Students"
          backgroundColor="var(--dark)"
        />
        <NavigationCard
          onClick={() => router.push("/sadmins/lectures")}
          icon={<RiAdminFill />}
          text="Manage Lectures"
          backgroundColor="var(--green)"
        />
      </nav>
    </div>
  );
}
