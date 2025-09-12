"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { RiAdminFill } from "react-icons/ri";
import { VscAccount } from "react-icons/vsc";

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user?.email) {
          const adminDocRef = doc(db, "superAdmins", user.email);
          const adminDocSnap = await getDoc(adminDocRef);

          if (adminDocSnap.exists()) {
            setIsSuperAdmin(true);
          } else {
            setError("Access denied: Super Admin privileges required");
            setTimeout(() => router.push("/"), 2000);
          }
        } else {
          setError("Authentication required");
          setTimeout(() => router.push("/"), 2000);
        }
      } catch (err) {
        console.error("Error checking admin status:", err);
        setError("Error verifying admin status");
        setTimeout(() => router.push("/"), 2000);
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
          Verifying admin access...
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
