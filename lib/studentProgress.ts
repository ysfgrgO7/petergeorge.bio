import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

/**
 * Fetches the progress for a specific lecture for a given student.
 * The progress document is stored at `students/{uid}/progress/{year}_{courseId}_{lectureId}`.
 *
 * @param uid The unique ID for the student (Firebase Auth UID).
 * @param year The academic year of the course (e.g., "year1", "year3").
 * @param courseId The ID of the course.
 * @param lectureId The ID of the lecture.
 * @returns A Promise that resolves to the lecture progress data, or { quizCompleted: false } if not found.
 */
export async function getLectureProgress(
  uid: string,
  year: string,
  courseId: string,
  lectureId: string
) {
  // Construct the document reference using the new path structure
  const docRef = doc(
    db,
    "students",
    uid, // Use uid instead of studentCode
    "progress",
    `${year}_${courseId}_${lectureId}`
  );
  const snap = await getDoc(docRef);
  return snap.exists()
    ? snap.data()
    : { quizCompleted: false, score: null, totalQuestions: null };
}

/**
 * Marks a specific quiz as complete for a student and saves their score.
 * The progress document is stored at `students/{uid}/progress/{year}_{courseId}_{lectureId}`.
 *
 * @param uid The unique ID for the student (Firebase Auth UID).
 * @param year The academic year of the course (e.g., "year1", "year3").
 * @param courseId The ID of the course.
 * @param lectureId The ID of the lecture.
 * @param score The student's score on the quiz.
 * @param totalQuestions The total number of questions in the quiz.
 * @returns A Promise that resolves when the progress is successfully marked.
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
    console.error("markQuizComplete received an invalid score:", score);
    throw new Error("Invalid score provided. Score must be a number.");
  }
  if (typeof totalQuestions !== "number" || isNaN(totalQuestions)) {
    console.error(
      "markQuizComplete received invalid totalQuestions:",
      totalQuestions
    );
    throw new Error(
      "Invalid total questions provided. Total questions must be a number."
    );
  }

  // Construct the document reference using the new path structure
  const docRef = doc(
    db,
    "students",
    uid, // Use uid instead of studentCode
    "progress",
    `${year}_${courseId}_${lectureId}`
  );
  await setDoc(
    docRef,
    {
      quizCompleted: true,
      score: score,
      totalQuestions: totalQuestions,
    },
    { merge: true }
  );
}
