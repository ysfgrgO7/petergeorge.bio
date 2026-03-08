import { FaClipboardList } from "react-icons/fa";
import styles from "../dashboard.module.css";
import { ProgressItem } from "@/lib/types";

export default function DetailedQuizLogs({
  progressGroups,
  error,
}: {
  progressGroups: Record<string, ProgressItem[]>;
  error: string;
}) {
  return (
    <div className={styles.card}>
      <div
        style={{
          marginBottom: "var(--spacing-lg)",
          borderBottom: "2px solid var(--blue)",
        }}
        className={styles.titleWithIcon}
      >
        <FaClipboardList color="var(--blue)" />
        <h2>Detailed Quiz Logs</h2>
      </div>
      {error ? (
        <p className={styles.error}>{error}</p>
      ) : Object.keys(progressGroups).length ? (
        Object.entries(progressGroups).map(([groupKey, items]) => (
          <div key={groupKey} className={styles.courseGroup}>
            <h4 className={styles.courseTitle}>{groupKey}</h4>
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lecture Name</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    return (
                      <tr key={item.id} className={styles.row}>
                        <td>{item.lectureTitle}</td>
                        <td>
                          {item.quiz
                            ? `${item.quiz.earnedMarks} / ${item.quiz.totalPossibleMarks}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        <p className={styles.empty}>
          Start your first lecture to see progress! ✨
        </p>
      )}
    </div>
  );
}
