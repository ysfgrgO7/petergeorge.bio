import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

/**
 * Fetches the progress for a specific lecture for a given student.
 * The progress document is stored at `students/{studentCode}/progress/{year}_{courseId}_{lectureId}`.
 *
 * @param studentCode The unique code for the student.
 * @param year The academic year of the course (e.g., "year1", "year3").
 * @param courseId The ID of the course.
 * @param lectureId The ID of the lecture.
 * @returns A Promise that resolves to the lecture progress data, or { quizCompleted: false } if not found.
 */
export async function getLectureProgress(
  studentCode: string,
  year: string,
  courseId: string,
  lectureId: string
) {
  // Construct the document reference using the new path structure
  const docRef = doc(
    db,
    "students",
    studentCode,
    "progress",
    `${year}_${courseId}_${lectureId}` // Use year, courseId, and lectureId for the progress document ID
  );
  const snap = await getDoc(docRef);
  return snap.exists()
    ? snap.data()
    : { quizCompleted: false, score: null, totalQuestions: null };
}

/**
 * Marks a specific quiz as complete for a student and saves their score.
 * The progress document is stored at `students/{studentCode}/progress/{year}_{courseId}_{lectureId}`.
 *
 * @param studentCode The unique code for the student.
 * @param year The academic year of the course (e.g., "year1", "year3").
 * @param courseId The ID of the course.
 * @param lectureId The ID of the lecture.
 * @param score The student's score on the quiz.
 * @param totalQuestions The total number of questions in the quiz.
 * @returns A Promise that resolves when the progress is successfully marked.
 */
export async function markQuizComplete(
  studentCode: string,
  year: string,
  courseId: string,
  lectureId: string,
  score: number, // New parameter for the score
  totalQuestions: number // New parameter for the total questions
) {
  // Defensive checks to ensure score and totalQuestions are valid numbers
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
    studentCode,
    "progress",
    `${year}_${courseId}_${lectureId}` // Use year, courseId, and lectureId for the progress document ID
  );
  await setDoc(
    docRef,
    {
      quizCompleted: true,
      score: score, // Save the actual score
      totalQuestions: totalQuestions, // Save the total questions
    },
    { merge: true } // Use merge: true to update existing fields without overwriting the entire document
  );
}
