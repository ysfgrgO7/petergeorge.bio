"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { FaChartLine, FaChartBar } from "react-icons/fa";
import { RiProgress5Line } from "react-icons/ri";
import { GiProgression } from "react-icons/gi";
import styles from "./dashboard.module.css";

// --- Interfaces ---
interface QuizData {
  earnedMarks: number;
  totalPossibleMarks: number;
}

interface ProgressItem {
  id: string;
  year: string;
  courseTitle: string;
  lectureTitle: string;
  quiz: QuizData | null;
  isHidden: boolean;
  order: number;
}

interface DashboardChartsProps {
  progressGroups: Record<string, ProgressItem[]>;
}

export const CircularProgress = ({ score }: { score: number }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={styles.circularProgress}>
      <svg viewBox="0 0 120 120">
        <circle className={styles.circleBg} cx="60" cy="60" r={radius} />
        <circle
          className={styles.circleFg}
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={styles.progressText}>{score}%</div>
    </div>
  );
};

export const DashboardCharts = ({ progressGroups }: DashboardChartsProps) => {
  const isMobile = window.innerWidth <= 768;
  const { chartData, averageScore } = useMemo(() => {
    // Flatten and filter quizzes
    const allQuizzes = Object.values(progressGroups)
      .flat()
      .filter((item) => item.quiz);

    // This remains in your original order (likely newest first based on your group sorting)
    const data = allQuizzes.map((item) => ({
      name:
        item.lectureTitle.length > 12
          ? item.lectureTitle.substring(0, 10) + ".."
          : item.lectureTitle,
      score: Math.round(
        (item.quiz!.earnedMarks / item.quiz!.totalPossibleMarks) * 100,
      ),
      fullTitle: item.lectureTitle,
      id: item.id,
      // Unique key for Recharts mapping
    }));

    // Reverse ONLY for the line chart so time flows Past -> Present (Left -> Right)
    const trend = [...data].reverse();
    const avg =
      data.length > 0
        ? Math.round(
            data.reduce((acc, curr) => acc + curr.score, 0) / data.length,
          )
        : 0;

    return { chartData: data, averageScore: avg };
  }, [progressGroups]);

  return (
    <>
      <br />
      {/* Recent Performance Bar Chart */}
      <div className={styles.card}>
        <div
          style={{
            marginBottom: "var(--spacing-lg)",
            borderBottom: "2px solid var(--blue)",
          }}
          className={styles.titleWithIcon}
        >
          <GiProgression color="var(--blue)" />
          <h2>Your Performance</h2>
        </div>
        <div className={styles.barChartContainer}>
          <div
            className={styles.chartContainer}
            style={{ width: isMobile ? "100%" : "75%" }}
          >
            <div className={styles.titleWithIcon}>
              <FaChartBar color="var(--blue)" />
              <h3>Recent Quiz Performance</h3>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={500}>
                <BarChart
                  data={chartData.slice(-5)}
                  margin={{ top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="fullTitle"
                    fontSize={9}
                    tick={{ fill: "var(--fg)" }}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    height={150}
                  />
                  <YAxis
                    domain={[0, 100]}
                    fontSize={11}
                    tick={{ fill: "var(--fg)" }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    contentStyle={{
                      backgroundColor: "var(--bg)",
                      border: "1px solid var(--blue)",
                      borderRadius: "8px",
                      color: "var(--fg)",
                    }}
                  />

                  <Bar dataKey="score" radius={[4, 4, 0, 0]} fill="var(--blue)">
                    {chartData.slice(-5).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.score >= 50 ? "var(--blue)" : "var(--red)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.emptyChart}>
                No quiz data available yet.
              </div>
            )}
          </div>

          <div className={styles.circularProgressContainer}>
            <div className={styles.titleWithIcon}>
              <RiProgress5Line color="var(--green)" />
              <h3>Average Score</h3>
            </div>
            <div className={styles.circularProgressWrapper}>
              <CircularProgress score={averageScore} />
            </div>
          </div>
        </div>

        <br style={{ height: "20px" }} />
        <div className={styles.chartContainer}>
          <div className={styles.titleWithIcon}>
            <FaChartLine color="var(--magenta)" />
            <h3>Performance Curve (Historical Trend)</h3>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={true}
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--magenta)"
                  strokeWidth={3}
                  connectNulls
                  dot={{
                    r: 4,
                    fill: "var(--magenta)",
                    strokeWidth: 2,
                    stroke: "var(--dark)",
                  }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.emptyChart}>No trend data yet.</div>
          )}
        </div>
      </div>
    </>
  );
};
