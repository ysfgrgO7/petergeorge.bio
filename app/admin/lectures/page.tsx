"use client";

import React, { Suspense } from "react";
import LecturePage from "./adminLectures"; // ✅ no curly braces
import Loading from "@/app/components/Loading";

export default function Page() {
  return (
    <Suspense fallback={<Loading text="Loading lecture..." />}>
      <LecturePage />
    </Suspense>
  );
}
