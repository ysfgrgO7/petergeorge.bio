import { DocumentData } from "firebase/firestore";

export interface Lecture extends DocumentData {
    id: string;
    title: string;
    odyseeName: string;
    odyseeId: string;
    order: number;
    isHidden?: boolean;
    isEnabledCenter?: boolean;
    isEnabledOnline?: boolean;
}

export interface Course extends DocumentData {
    id: string;
    title: string;
    description: string;
    thumbnailUrl?: string;
}

export interface ExtraLink {
    text: string;
    url: string;
}

export interface QuizData {
    earnedMarks: number;
    totalPossibleMarks: number;
}

export interface UserProfile {
    firstName: string;
    secondName: string;
    thirdName: string;
    forthName: string;
    email: string;
    studentPhone: string;
    fatherPhone: string;
    motherPhone: string;
    year: string;
    system: string;
    gender: string;
    school: string;
    studentCode: string;
    createdAt: string;
    devices?: string[];
    uid: string;
}

export interface ProgressItem {
    id: string;
    year: string;
    courseTitle: string;
    lectureTitle: string;
    quiz: QuizData | null;
    isHidden: boolean;
    order: number;
}
