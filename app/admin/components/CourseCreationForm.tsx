import React from "react";
import styles from "../admin.module.css";

interface CourseCreationFormProps {
  title: string;
  setTitle: (val: string) => void;
  thumbnailUrl: string;
  setThumbnailUrl: (val: string) => void;
  yearForNewCourse: "year1" | "year3 (Biology)" | "year3 (Geology)";
  setYearForNewCourse: (
    val: "year1" | "year3 (Biology)" | "year3 (Geology)",
  ) => void;
  handleCreate: () => void;
}

export default function CourseCreationForm({
  title,
  setTitle,
  thumbnailUrl,
  setThumbnailUrl,
  yearForNewCourse,
  setYearForNewCourse,
  handleCreate,
}: CourseCreationFormProps) {
  return (
    <>
      <h1>Create Course</h1>
      <div className={styles.form}>
        <input
          type="text"
          placeholder="Course title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="url"
          placeholder="Thumbnail URL (optional)"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
        />
        <select
          value={yearForNewCourse}
          onChange={(e) =>
            setYearForNewCourse(
              e.target.value as "year1" | "year3 (Biology)" | "year3 (Geology)",
            )
          }
        >
          <option value="year1">Year 1</option>
          <option value="year3 (Biology)">Year 3 (Biology)</option>
          <option value="year3 (Geology)">Year 3 (Geology)</option>
        </select>
        <button onClick={handleCreate}>Create Course</button>
      </div>
    </>
  );
}
