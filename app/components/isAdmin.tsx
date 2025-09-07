"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import DisableRightClick from "@/app/components/disableRightClicks";

type AdminContextType = {
  isAdmin: boolean;
  isLoading: boolean;
};

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  isLoading: true,
});

export const useAdmin = () => useContext(AdminContext);

export default function AdminProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user?.email) {
        const adminDoc = await getDoc(doc(db, "admins", user.email));
        setIsAdmin(adminDoc.exists());
      } else {
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ isAdmin, isLoading }}>
      {!isAdmin && <DisableRightClick />}
      {children}
    </AdminContext.Provider>
  );
}
