"use client";

import { useStudentProgress } from "@/lib/hooks/useStudentProgress";
import StudentProfileCard from "./components/StudentProfileCard";
import DetailedQuizLogs from "./components/DetailedQuizLogs";
import styles from "./dashboard.module.css";
import { useTheme } from "@/app/components/ThemeProvider";
import { DashboardCharts } from "./charts";
import Loading from "@/app/components/Loading";

import { QuizData, UserProfile, ProgressItem } from "@/lib/types";

export default function StudentDashboard() {
  const { progressGroups, studentInfo, loading, error } = useStudentProgress();
  const { isHalloween, isXmas, isRamadan } = useTheme();

  if (loading) return <Loading text="Loading your dashboard..." />;

  return (
    <div className="wrapper">
      <div
        className={styles.titleWithIcon}
        style={{
          marginBottom: "var(--spacing-lg)",
          borderBottom: "2px solid var(--blue)",
        }}
      >
        {isHalloween && <span>🎃</span>}
        {isXmas && <span>🎄</span>}
        {isRamadan && <span>🌙</span>}
        <h1>My Dashboard</h1>
      </div>

      <StudentProfileCard studentInfo={studentInfo} />

      <DashboardCharts progressGroups={progressGroups} />
      <br />
      <DetailedQuizLogs progressGroups={progressGroups} error={error} />
    </div>
  );
}
