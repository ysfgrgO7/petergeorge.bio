"use client";

import React, { Suspense } from "react";
import LecturePage from "./adminLectures"; // ✅ no curly braces

export default function Page() {
  return (
    <Suspense fallback={<div>Loading lecture...</div>}>
      <LecturePage />
    </Suspense>
  );
}