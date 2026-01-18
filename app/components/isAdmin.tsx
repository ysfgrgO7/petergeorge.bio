"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import DisableRightClick from "@/app/components/disableRightClicks";
import Loading from "@/app/components/Loading";

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
  nonce,
}: {
  children: React.ReactNode;
  nonce: string;
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
    return <Loading text="Verifying admin access..." />;
  }

  return (
    <AdminContext.Provider value={{ isAdmin, isLoading }}>
      {!isAdmin && <DisableRightClick nonce={nonce} />}
      {children}
    </AdminContext.Provider>
  );
}
