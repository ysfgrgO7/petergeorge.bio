"use client";

import React, { Suspense } from "react";
import StudentProfileContent from "./StudentProfileContent";
import styles from "./student-profile.module.css";

function LoadingFallback() {
  return (
    <div className={styles.center}>
      <p>Loading student profile...</p>
    </div>
  );
}

export default function StudentProfilePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StudentProfileContent />
    </Suspense>
  );
}
