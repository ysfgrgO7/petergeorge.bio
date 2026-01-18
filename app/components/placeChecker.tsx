"use client";

import { useEffect } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";

export default function PlaceChecker() {
  const router = useRouter();
  const pathname = usePathname();
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
    let unsubscribeSnapshot: (() => void) | null = null;
    const auth = getAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // 1. Exit if not logged in or on auth pages
      if (!user || isAuthPage) {
        if (unsubscribeSnapshot) unsubscribeSnapshot();
        return;
      }

      const studentRef = doc(db, "students", user.uid);
      const deviceId = getDeviceId();

      // 2. Immediate Initial Check
      const snap = await getDoc(studentRef);
      if (snap.exists()) {
        const devices: string[] = snap.data().devices || [];
        if (!devices.includes(deviceId)) {
          await signOut(auth);
          router.push("/login?error=device_removed");
          return;
        }
      }

      // 3. Real-time Monitoring (Listen for admin removing device)
      unsubscribeSnapshot = onSnapshot(studentRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const devices: string[] = docSnapshot.data()?.devices || [];
          if (!devices.includes(deviceId)) {
            signOut(auth);
            router.push("/login?error=device_removed");
          }
        } else {
          signOut(auth);
          router.push("/login?error=account_removed");
        }
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [router, isAuthPage]);

  return null; // Component stays invisible
}
