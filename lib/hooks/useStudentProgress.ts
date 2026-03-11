import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, ProgressItem, QuizData } from "@/lib/types";
import { useRouter } from "next/navigation";

export function useStudentProgress() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [progressGroups, setProgressGroups] = useState<
        Record<string, ProgressItem[]>
    >({});
    const [loading, setLoading] = useState(true);
    const [studentInfo, setStudentInfo] = useState<UserProfile | null>(null);
    const [error, setError] = useState<string>("");

    const auth = getAuth();
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            setLoading(true);
            setError("");

            if (!user || !user.uid) {
                router.push("/");
                return;
            }

            const studentId = user.uid.trim();

            try {
                // 1. Fetch Student Profile
                const userSnap = await getDoc(doc(db, "students", studentId));
                if (userSnap.exists()) {
                    setStudentInfo({
                        ...(userSnap.data() as UserProfile),
                        uid: user.uid,
                    });
                }

                // 2. Fetch Progress Data
                const progressSnap = await getDocs(
                    collection(db, "students", studentId, "progress"),
                );

                if (progressSnap.empty) {
                    setProgressGroups({});
                    setLoading(false);
                    return;
                }

                const parsed = progressSnap.docs.map((d) => {
                    const [year, courseId, lectureId] = d.id.split("_");
                    return {
                        id: d.id,
                        year,
                        courseId,
                        lectureId,
                        quiz: d.data() as QuizData,
                    };
                });

                const uniqueYears = [...new Set(parsed.map((p) => p.year))];

                // 3. Fetch Courses
                const courseDocs = await Promise.all(
                    uniqueYears.map((y) =>
                        getDocs(collection(db, "years", y, "courses")),
                    ),
                );

                const courseMap: Record<string, { year: string; title: string }> = {};
                courseDocs.forEach((snap, idx) => {
                    const yearKey = uniqueYears[idx];
                    snap.forEach((c) => {
                        const data = c.data() as DocumentData;
                        courseMap[`${yearKey}_${c.id}`] = {
                            year: yearKey,
                            title: data.title || c.id,
                        };
                    });
                });

                // 4. Fetch Lectures
                const lectureDocs = await Promise.all(
                    parsed.map((p) =>
                        getDoc(
                            doc(
                                db,
                                "years",
                                p.year,
                                "courses",
                                p.courseId,
                                "lectures",
                                p.lectureId,
                            ),
                        ),
                    ),
                );

                const lectureMap: Record<
                    string,
                    { title: string; isHidden: boolean; order: number }
                > = {};
                lectureDocs.forEach((snap) => {
                    if (snap.exists()) {
                        const data = snap.data() as DocumentData;
                        lectureMap[snap.id] = {
                            title: data.title || snap.id,
                            isHidden: !!data.isHidden,
                            order: typeof data.order === "number" ? data.order : 9999,
                        };
                    }
                });

                // 5. Build Final Items
                const items: ProgressItem[] = parsed.map((p) => {
                    const courseKey = `${p.year}_${p.courseId}`;
                    const course = courseMap[courseKey];
                    const lectureData = lectureMap[p.lectureId] || {
                        title: p.lectureId,
                        isHidden: false,
                        order: 9999,
                    };
                    return {
                        id: p.id,
                        year: course?.year || p.year,
                        quiz: p.quiz,
                        courseTitle: course?.title || p.courseId,
                        lectureTitle: lectureData.title,
                        isHidden: lectureData.isHidden,
                        order: lectureData.order,
                    };
                });

                // 6. Group and Sort
                const grouped: Record<string, ProgressItem[]> = {};
                items
                    .filter(
                        (i) =>
                            !i.isHidden &&
                            i.quiz !== null &&
                            typeof i.quiz.earnedMarks === "number",
                    ) // Strictly filter out lectures without valid quizzes
                    .sort((a, b) => {
                        // Sort by Year (Desc), Course Title (Asc), then Lecture Order (Asc)
                        if (a.year !== b.year) return b.year.localeCompare(a.year);
                        if (a.courseTitle !== b.courseTitle)
                            return a.courseTitle.localeCompare(b.courseTitle);
                        return a.order - b.order;
                    })
                    .forEach((item) => {
                        const key = `${item.year} - ${item.courseTitle}`;
                        if (!grouped[key]) grouped[key] = [];
                        grouped[key].push(item);
                    });

                setProgressGroups(grouped);
            } catch (err) {
                console.error("Error fetching progress:", err);
                setError("Failed to load your progress.");
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [auth, router]);

    return { currentUser, progressGroups, loading, studentInfo, error };
}
