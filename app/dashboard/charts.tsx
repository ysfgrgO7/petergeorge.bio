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
import { FaChartLine } from "react-icons/fa";
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
  const { chartData, trendData, averageScore } = useMemo(() => {
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
      id: item.id, // Unique key for Recharts mapping
    }));

    // Reverse ONLY for the line chart so time flows Past -> Present (Left -> Right)
    const trend = [...data].reverse();

    const avg =
      data.length > 0
        ? Math.round(
            data.reduce((acc, curr) => acc + curr.score, 0) / data.length,
          )
        : 0;

    return { chartData: data, trendData: trend, averageScore: avg };
  }, [progressGroups]);

  return (
    <>
      <br />
      {/* Recent Performance Bar Chart */}
      <div className={styles.card}>
        <div className={styles.titleWithIcon}>
          <FaChartLine color="var(--blue)" />
          <h3>Recent Quiz Performance</h3>
        </div>

        <div className={styles.barChartContainer}>
          <div className={styles.chartContainer}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={chartData.slice(-5)}
                  margin={{ top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    tick={{ fill: "var(--fg)" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    fontSize={11}
                    tick={{ fill: "var(--fg)" }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    contentStyle={{
                      backgroundColor: "var(--dark)",
                      border: "1px solid var(--blue)",
                      borderRadius: "8px",
                      color: "var(--fg)",
                    }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.slice(-5).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.score >= 50 ? "var(--green)" : "var(--red)"}
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

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
            className={styles.chartContainer}
          >
            <CircularProgress score={averageScore} />
            <span>Average Score</span>
          </div>
        </div>
      </div>

      <br />
      {/* Historical Performance Line Chart */}
      {/* <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.titleWithIcon}>
            <FaChartLine color="var(--magenta)" />
            <h3>Performance Curve (Historical Trend)</h3>
          </div>
        </div>
        <div
          className={styles.chartContainer}
          style={{ background: "none", padding: "0 10px" }}
        >
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={trendData}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis dataKey="name" hide />
                <YAxis domain={[0, 105]} hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--dark)",
                    border: "1px solid var(--magenta)",
                    borderRadius: "8px",
                  }}
                />
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
      </div> */}
    </>
  );
};
