import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

/**
 * Fetches the progress for a specific lecture for a given student.
 * The progress document is stored at:
 *    students/{uid}/progress/{year}_{courseId}_{lectureId}
 */
export async function getLectureProgress(
  uid: string,
  year: string,
  courseId: string,
  lectureId: string
) {
  const docRef = doc(
    db,
    "students",
    uid,
    "progress",
    `${year}_${courseId}_${lectureId}`
  );
  const snap = await getDoc(docRef);
  return snap.exists()
    ? snap.data()
    : {
        quizCompleted: false,
        score: null,
        totalQuestions: null,
        unlocked: false,
      };
}

/**
 * Marks a specific quiz as complete for a student and saves their score.
 */
export async function markQuizComplete(
  uid: string,
  year: string,
  courseId: string,
  lectureId: string,
  score: number,
  totalQuestions: number
) {
  if (typeof score !== "number" || isNaN(score)) {
    throw new Error("Invalid score provided. Score must be a number.");
  }
  if (typeof totalQuestions !== "number" || isNaN(totalQuestions)) {
    throw new Error("Invalid total questions provided. Must be a number.");
  }

  const docRef = doc(
    db,
    "students",
    uid,
    "progress",
    `${year}_${courseId}_${lectureId}`
  );
  await setDoc(
    docRef,
    {
      quizCompleted: true,
      score,
      totalQuestions,
    },
    { merge: true }
  );
}

/**
 * Unlocks a lecture for a student.
 */
export async function unlockLecture(
  uid: string,
  year: string,
  courseId: string,
  lectureId: string
) {
  const docRef = doc(
    db,
    "students",
    uid,
    "progress",
    `${year}_${courseId}_${lectureId}`
  );
  await setDoc(
    docRef,
    {
      unlocked: true,
    },
    { merge: true }
  );
}
