// lib/studentProgress.ts

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Key format: "courseId_lectureIndex"
export async function getLectureProgress(
  studentCode: string,
  courseId: string,
  lectureIndex: number
) {
  const docRef = doc(
    db,
    "students",
    studentCode,
    "progress",
    `${courseId}_${lectureIndex}`
  );
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : { quizCompleted: false, watched: false };
}

export async function markQuizComplete(
  studentCode: string,
  courseId: string,
  lectureIndex: number
) {
  const docRef = doc(
    db,
    "students",
    studentCode,
    "progress",
    `${courseId}_${lectureIndex}`
  );
  await setDoc(
    docRef,
    { quizCompleted: true, watched: false },
    { merge: true }
  );
}
