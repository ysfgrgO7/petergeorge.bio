// app/components/PlaceChecker.tsx
"use client";

import { useEffect, useState } from "react";
import PopupModal from "@/app/popupModal";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PlaceChecker() {
  const [showModal, setShowModal] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<"center" | "online">(
    "center"
  );
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setUid(user.uid);

      const studentRef = doc(db, "students", user.uid);
      const snap = await getDoc(studentRef);

      if (snap.exists()) {
        if (!snap.data().system) {
          setShowModal(true);
        }
      } else {
        // create empty doc if not exists
        await setDoc(studentRef, {});
        setShowModal(true);
      }
    });

    return () => unsubscribe();
  }, []);

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
