// app/components/PlaceChecker.tsx
"use client";

import { useEffect, useState } from "react";
import PopupModal from "@/app/popupModal";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";

export default function PlaceChecker() {
  const [showModal, setShowModal] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<"center" | "online">(
    "center"
  );
  const [uid, setUid] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Don't run device checks on login/register pages
  const isAuthPage = pathname === "/login" || pathname === "/register";

  const getDeviceId = () => {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || isAuthPage) return; // Don't run on login/register pages
      setUid(user.uid);

      const studentRef = doc(db, "students", user.uid);
      const snap = await getDoc(studentRef);

      if (snap.exists()) {
        if (!snap.data().system) {
          setShowModal(true);
        } else {
          // User is fully set up, now check if their device is still authorized
          const deviceId = getDeviceId();
          const devices: string[] = snap.data().devices || [];

          if (!devices.includes(deviceId)) {
            signOut(auth);
            router.push("/login?error=device_removed");
          }
        }
      } else {
        // create empty doc if not exists
        await setDoc(studentRef, {});
        setShowModal(true);
      }
    });

    return () => unsubscribe();
  }, [router, isAuthPage]);

  // Real-time device monitoring for logged-in users
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;
    const auth = getAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user && !isAuthPage) {
        // Don't run on login/register pages
        const studentRef = doc(db, "students", user.uid);
        const snap = await getDoc(studentRef);

        // Only monitor devices if user has completed system selection
        if (snap.exists() && snap.data().system) {
          const deviceId = getDeviceId();

          // Set up real-time listener for device changes
          unsubscribeSnapshot = onSnapshot(
            studentRef,
            (docSnapshot) => {
              if (docSnapshot.exists()) {
                const studentData = docSnapshot.data();
                const devices: string[] = studentData?.devices || [];

                // If current device is not in the list, log out
                if (!devices.includes(deviceId)) {
                  signOut(auth);
                  router.push("/login?error=device_removed");
                }
              } else {
                // If student document doesn't exist, log out
                signOut(auth);
                router.push("/login?error=account_removed");
              }
            },
            (error) => {
              console.error("Error monitoring device list:", error);
            }
          );
        }
      } else {
        // Clean up snapshot listener when user logs out
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }
      }
    });

    // Cleanup function
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, [router, isAuthPage]);

  const handleSave = async () => {
    if (!uid) return;
    await setDoc(
      doc(db, "students", uid),
      { system: selectedPlace },
      { merge: true }
    );
    setShowModal(false);
  };

  const handleCancel = () => {
    const auth = getAuth();
    auth.signOut();
    setShowModal(false);
  };

  return (
    <PopupModal
      isOpen={showModal}
      message="Please select your learning system"
      confirmText="Save"
      cancelText="Logout"
      onConfirm={handleSave}
      onCancel={handleCancel}
    >
      <div style={{ marginTop: "1rem" }}>
        <select
          value={selectedPlace}
          onChange={(e) =>
            setSelectedPlace(e.target.value as "center" | "online")
          }
          style={{
            padding: "0.5rem",
            width: "100%",
            borderRadius: "4px",
          }}
        >
          <option value="center">Center</option>
          <option value="online">Online</option>
        </select>
      </div>
    </PopupModal>
  );
}
