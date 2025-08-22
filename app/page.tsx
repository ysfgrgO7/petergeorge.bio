// "use client";

// import Image from "next/image";
// import styles from "./page.module.css";
// import { useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
// import { onAuthStateChanged } from "firebase/auth";
// import { auth } from "@/lib/firebase";

// export default function Home() {
//   const router = useRouter();
//   const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

//   useEffect(() => {
//     // Listen for Firebase auth state changes
//     const unsubscribe = onAuthStateChanged(auth, (user) => {
//       if (user) {
//         setIsLoggedIn(true);
//       } else {
//         setIsLoggedIn(false);
//       }
//     });

//     // Cleanup the listener on unmount
//     return () => unsubscribe();
//   }, []);

//   const handleButtonClick = (year: string) => {
//     if (isLoggedIn) {
//       router.push(`/courses?year=${year}`);
//     } else {
//       router.push(`/login`);
//     }
//   };

//   return (
//     <div className="wrapper">
//       <h1 style={{ textAlign: "center", marginBottom: "4rem" }}>
//         You bring the dream ... We bring the Way
//       </h1>
//       <div className={styles.buttonContainer}>
//         <button
//           className={styles.button}
//           onClick={() => handleButtonClick("year1")}
//         >
//           <strong>Integrated Sciences</strong>
//           <Image
//             src="/science.svg"
//             alt="Integrated Sciences"
//             width={250}
//             height={250}
//             draggable={false}
//           />
//           First Secondary
//         </button>
//         <button
//           className={styles.button}
//           onClick={() => handleButtonClick("year3")}
//         >
//           <strong>Biology</strong>
//           <Image
//             draggable={false}
//             src="/heart.svg"
//             alt="Biology"
//             width={250}
//             height={250}
//           />
//           Third Secondary
//         </button>
//         <button
//           className={styles.button}
//           onClick={() => handleButtonClick("year3")}
//         >
//           <strong>Geology</strong>
//           <Image
//             draggable={false}
//             src="/earth.svg"
//             alt="Geology"
//             width={250}
//             height={250}
//           />
//           Third Secondary
//         </button>
//       </div>
//     </div>
//   );
// }

"use client";

import Image from "next/image";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase"; // ensure db is exported in firebase.ts
import { doc, getDoc } from "firebase/firestore";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentYear, setStudentYear] = useState<string | null>(null);

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);

        // Fetch student year from Firestore
        const studentRef = doc(db, "students", user.uid);
        const snap = await getDoc(studentRef);
        if (snap.exists()) {
          const data = snap.data();
          setStudentYear(data.year); // assuming you store { year: "year1" | "year3" }
        }
      } else {
        setIsLoggedIn(false);
        setStudentYear(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleButtonClick = (year: string) => {
    if (isLoggedIn) {
      router.push(`/courses?year=${year}`);
    } else {
      router.push(`/login`);
    }
  };

  // Define buttons with their years
  const buttons = [
    {
      year: "year1",
      title: "Integrated Sciences",
      label: "First Secondary",
      img: "/science.svg",
    },
    {
      year: "year3",
      title: "Biology",
      label: "Third Secondary",
      img: "/heart.svg",
    },
    {
      year: "year3",
      title: "Geology",
      label: "Third Secondary",
      img: "/earth.svg",
    },
  ];

  return (
    <div className="wrapper">
      <h1 style={{ textAlign: "center", marginBottom: "4rem" }}>
        You bring the dream ... We bring the Way
      </h1>
      <div className={styles.buttonContainer}>
        {buttons
          .filter((btn) => !isLoggedIn || btn.year === studentYear) // show only allowed year if logged in
          .map((btn) => (
            <button
              key={btn.title}
              className={styles.button}
              onClick={() => handleButtonClick(btn.year)}
            >
              <strong>{btn.title}</strong>
              <Image src={btn.img} alt={btn.title} width={250} height={250} draggable={false} />
              {btn.label}
            </button>
          ))}
      </div>
    </div>
  );
}
