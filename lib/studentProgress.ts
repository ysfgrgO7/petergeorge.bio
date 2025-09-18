import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";

/**
 * Helper function to fetch a lecture's title.
 */
export async function getLectureTitle(
  year: string,
  courseId: string,
  lectureId: string
): Promise<string> {
  const lectureDocRef = doc(
    db,
    "years",
    year,
    "courses",
    courseId,
    "lectures",
    lectureId
  );
  const lectureSnap = await getDoc(lectureDocRef);
  if (lectureSnap.exists()) {
    const lectureData = lectureSnap.data();
    return lectureData.title || "Untitled Lecture";
  }
  return "Unknown Lecture";
}

/**
 * Fetches the progress for a specific lecture for a given student.
 * Stored at:
 * students/{uid}/progress/{year}_{courseId}_{lectureId}
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
        earnedMarks: null,
        totalPossibleMarks: null,
        unlocked: false,
        attempts: 0, // Track number of attempts
      };
}

/**
 * Increments the attempt counter for a quiz and tracks used variants
 */
export async function incrementQuizAttempt(
  uid: string,
  year: string,
  courseId: string,
  lectureId: string,
  variantUsed: string
) {
  const docRef = doc(
    db,
    "students",
    uid,
    "progress",
    `${year}_${courseId}_${lectureId}`
  );

  // Check if document exists first
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    const usedVariants = data.usedVariants || [];

    // Document exists, increment the attempts field and track variant
    await updateDoc(docRef, {
      attempts: increment(1),
      usedVariants: [...usedVariants, variantUsed],
      lastVariantUsed: variantUsed,
    });
  } else {
    // Document doesn't exist, create it with attempts: 1
    await setDoc(docRef, {
      quizCompleted: false,
      earnedMarks: null,
      totalPossibleMarks: null,
      unlocked: false,
      attempts: 1,
      usedVariants: [variantUsed],
      lastVariantUsed: variantUsed,
    });
  }
}

/**
 * Gets the current attempt count and checks if max attempts reached
 */
export async function getQuizAttemptInfo(
  uid: string,
  year: string,
  courseId: string,
  lectureId: string
): Promise<{
  attempts: number;
  maxAttemptsReached: boolean;
  usedVariants: string[];
}> {
  const docRef = doc(
    db,
    "students",
    uid,
    "progress",
    `${year}_${courseId}_${lectureId}`
  );

  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    const attempts = data.attempts || 0;
    const usedVariants = data.usedVariants || [];

    return {
      attempts,
      maxAttemptsReached: attempts >= 3,
      usedVariants,
    };
  }

  return {
    attempts: 0,
    maxAttemptsReached: false,
    usedVariants: [],
  };
}

/**
 * Marks a specific quiz as complete for a student, saves their score.
 */
export async function markQuizComplete(
  uid: string,
  year: string,
  courseId: string,
  lectureId: string,
  earnedMarks: number,
  totalPossibleMarks: number
) {
  if (typeof earnedMarks !== "number" || isNaN(earnedMarks)) {
    throw new Error("Invalid score provided. Score must be a number.");
  }
  if (typeof totalPossibleMarks !== "number" || isNaN(totalPossibleMarks)) {
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
      earnedMarks: earnedMarks,
      total: totalPossibleMarks, // Corrected from totalQuestions to total
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

